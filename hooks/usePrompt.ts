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
import { createClient } from '@/lib/supabase/client';

export function usePrompt(
  familyId: string | undefined, 
  isAiMode: boolean, 
  onSuccess: (summary: string) => void,
  onOptimisticSubmit?: (intent: 'ADD_TASK' | 'ADD_SHOPPING', title: string, assignee?: string) => void
) {
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
        onSuccess('פעולת ה-AI בוטלה. המשימה נשמרה כרגיל.');
      }
    };
    window.addEventListener('ai-abort', handleAbort);
    return () => window.removeEventListener('ai-abort', handleAbort);
  }, [onSuccess]);

  const submit = async (overrideType?: 'task' | 'shopping') => {
    if (!prompt.trim() || !familyId) return;

    setIsLoading(true);
    setError(null);
    // Do not clear prompt here, clear it upon success or keep it if error
    const rawPrompt = prompt;

    try {
      // DUMB MODE: Fast path with local rule-based intent recognition (no Claude call)
      if (!isAiMode) {
        const evaluation = evaluateTask(rawPrompt);
        const finalPrompt = evaluation.cleanText || rawPrompt;
        const intent = evaluation.intent; // 'Add Shopping Item' | 'Add Task'
        const assignee = evaluation.assignee;
        const mappedIntent = intent === 'Add Shopping Item' ? 'ADD_SHOPPING' : 'ADD_TASK';

        // 1. Optimistic UI Update
        if (onOptimisticSubmit) {
          onOptimisticSubmit(mappedIntent, finalPrompt, assignee);
        }

        // 2. Direct DB Call (Bypass API Route)
        const supabase = createClient();
        if (mappedIntent === 'ADD_SHOPPING') {
          const { error } = await supabase.rpc('rpc_add_shopping_item', {
            p_family_id: familyId,
            p_name: finalPrompt,
            // rpc handles created_by via auth.uid() automatically
          });
          if (error) throw new Error(error.message || 'שגיאה בשמירה');
        } else {
          const { error } = await supabase.rpc('rpc_add_task', {
            p_household_id: familyId,
            p_title: finalPrompt,
            p_assignee: assignee || null,
          });
          if (error) throw new Error(error.message || 'שגיאה בשמירה');
        }

        setIsLoading(false);
        setPrompt(''); // clear input only on success
        return;
      }

      // AI MODE: Smart routing
      const evaluation = evaluateTask(rawPrompt);

      if (evaluation.route === 'BLOCK') {
        setError('FamilyOS מיועד למשימות משפחתיות בלבד.');
        setIsLoading(false);
        return;
      }

      // If user explicitly turned ON the AI mode, we send it to Claude,
      // regardless of whether evaluateTask thought it was a simple 'DB' task!

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
        setPrompt('');
        onSuccess(data.summary);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('AI fetch aborted by user');
        setPrompt(rawPrompt);
      } else {
        console.error('Agent error:', err);
        setError(err.message || 'Error communicating with Agent');
        setPrompt(rawPrompt);
      }
      setIsLoading(false);
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
