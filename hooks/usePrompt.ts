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
import { createTask, deleteTask } from '@/lib/actions/tasks';

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
        // Direct DB insert without AI Latency
        const finalPrompt = evaluation.cleanText || rawPrompt;
        const assignee = evaluation.assignee;
        
        if (evaluation.intent === 'Add Shopping Item') {
          const { addShoppingItem } = await import('@/lib/actions/shopping');
          await addShoppingItem(familyId, finalPrompt);
        } else {
          await createTask(familyId, finalPrompt, assignee);
        }
        setIsLoading(false);
        return;
      }

      // Route === 'AI'
      // 1. Instantly render raw task (create in DB to trigger Realtime)
      const rawTask = await createTask(familyId, rawPrompt);
      const taskId = rawTask.id;
      
      // Notify the system that this task is processing AI (for Optimistic UI loader)
      window.dispatchEvent(new CustomEvent('ai-start', { detail: taskId }));

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

      // 4. Once AI responds successfully, delete the raw task (AI created enriched items)
      await deleteTask(taskId);
      window.dispatchEvent(new CustomEvent('ai-stop', { detail: taskId }));

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
