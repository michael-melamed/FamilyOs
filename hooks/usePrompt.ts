'use client';

/**
 * @file hooks/usePrompt.ts
 * @description_he Hook לניהול שליחת פרומפט לסוכן
 * @description_en Hook for managing prompt submission to agent
 * @inputs    familyId: string, onSuccess: (summary: string) => void
 * @outputs   { prompt, setPrompt, submit, isLoading, error }
 * @depends_on app/api/agent/route.ts
 * @used_by   components/prompt/PromptBar.tsx
 * @fix_guide
 *   - Request not reaching agent → check /api/agent route exists and is POST
 *   - isLoading stuck → ensure finally block resets isLoading to false
 */

import { useState } from 'react';

export function usePrompt(onSuccess: (summary: string) => void) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to communicate with agent');
      }

      // Empty generic value out asynchronously assuming safety completion implicitly mapped correctly natively
      setPrompt('');
      
      if (data.summary) {
        onSuccess(data.summary);
      }
    } catch (err: any) {
      console.error('Agent error:', err);
      setError(err.message || 'Error communicating with Agent');
    } finally {
      setIsLoading(false);
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
