'use client';

/**
 * @file hooks/usePrompt.ts
 * @description_he Hook לניהול שליחת פרומפט לסוכן
 * @description_en Hook for managing prompt submission to agent
 * @inputs    familyId: string | undefined, onSuccess: (summary: string) => void
 * @outputs   { prompt, setPrompt, submit, isLoading, error }
 * @depends_on app/api/agent/route.ts
 * @used_by   components/prompt/PromptBar.tsx
 * @fix_guide
 *   - Request not reaching agent → check /api/agent route exists and is POST
 *   - isLoading stuck → ensure finally block resets isLoading to false
 *   - "user has no household" → ensure familyId is passed and not undefined
 */

import { useState, useRef, useEffect } from 'react';
import { evaluateTask } from '@/lib/agent/router';

export function usePrompt(familyId: string | undefined, onSuccess: (summary: string) => void) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Listen for abort events from TaskItems
  useEffect(() => {
    const handleAbort = () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsLoading(false);
        // The raw task is kept in the DB as requested
        onSuccess('פעולת ה-AI בוטלה. המשימה נשמרה כרגיל.');
      }
    };
    window.addEventListener('ai-abort', handleAbort);
    return () => window.removeEventListener('ai-abort', handleAbort);
  }, [onSuccess]);

  const submit = async () => {
    if (!prompt.trim() || !familyId) return;

    const evaluation = evaluateTask(prompt);

    if (evaluation.route === 'BLOCK') {
      setError('FamilyOS מיועד למשימות משפחתיות בלבד.');
      return;
    }

    setIsLoading(true);
    setError(null);
    const rawPrompt = prompt;
    setPrompt('');

    try {

      if (evaluation.route === 'DB') {
        // Even for simple DB inserts, go through /api/agent so we never call
        // 'use server' functions directly from a Client Component (causes 500).
        const finalPrompt = evaluation.cleanText || rawPrompt;
        const intent = evaluation.intent; // 'Add Shopping Item' | 'Add Task'
        const assignee = evaluation.assignee;

        const res = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: finalPrompt,
            familyId,
            // Hint the route so the API can skip Claude and go straight to DB
            _dbHint: intent === 'Add Shopping Item' ? 'ADD_SHOPPING' : 'ADD_TASK',
            _assignee: assignee,
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || 'שגיאה בשמירה');
        }
        setIsLoading(false);
        return;
      }

      // Route === 'AI'
      // Dispatch ai-processing-start to UI with the prompt text
      window.dispatchEvent(new CustomEvent('ai-processing-start', { detail: rawPrompt }));

      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: rawPrompt, familyId }),
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to communicate with agent');
      }

      window.dispatchEvent(new CustomEvent('ai-processing-stop'));

      if (data.summary) {
        onSuccess(data.summary);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('AI fetch aborted by user');
      } else {
        console.error('Agent error:', err);
        setError(err.message || 'Error communicating with Agent');
      }
    } finally {
      setIsLoading(false);
      // Clean up any remaining processing state just in case
      window.dispatchEvent(new CustomEvent('ai-clear-all'));
    }
  };

  return {
    prompt,
    setPrompt,
    submit,
    isLoading,
    error,
  };
}
