'use client';

/**
 * @file components/prompt/PromptBar.tsx
 * @description_he שורת קלט חופשי קבועה בתחתית — לב האינטראקציה עם הסוכן
 * @description_en Fixed free-text input bar at bottom — the heart of agent interaction
 * @inputs    familyId: string, onAgentResponse: (summary: string) => void
 * @outputs   JSX input bar
 * @depends_on hooks/usePrompt.ts
 * @used_by   app/dashboard/page.tsx
 * @fix_guide
 *   - Bar covered by mobile keyboard → add padding-bottom to board equal to bar height
 *   - Submit button not working → check usePrompt handles Enter key and button click
 *   - Hebrew text direction wrong → add dir="rtl" to the input element itself
 */

import { useState, useRef, useEffect } from 'react';
import { usePrompt } from '@/hooks/usePrompt';

type PromptBarProps = {
  familyId: string | undefined;
  onAgentResponse: (summary: string) => void;
};

export function PromptBar({ familyId, onAgentResponse }: PromptBarProps) {
  const { prompt, setPrompt, submit, isLoading, error } = usePrompt(onAgentResponse);
  const inputRef = useRef<HTMLInputElement>(null);

  // We explicitly fire native keyboard bindings for Enter bounds automatically resolving cleanly
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-3xl mx-auto w-full z-50">
      <div className="relative bottom-4 mx-4">
        {error && (
          <div className="absolute -top-12 left-0 right-0 bg-red-100 text-red-600 text-sm p-2 rounded shadow text-center truncate">
            {error}
          </div>
        )}
        
        <div className="flex items-center bg-white shadow-lg border border-[#C8D4E8] rounded-full overflow-hidden h-14 p-1 pl-3 transition-shadow focus-within:shadow-xl focus-within:border-[#2E4A7A]">
          <button 
            type="button"
            onClick={submit}
            disabled={isLoading || !prompt.trim() || !familyId}
            className="w-10 h-10 shrink-0 bg-[#2E4A7A] hover:bg-[#1B2A4A] text-white rounded-full flex justify-center items-center cursor-pointer transition-colors disabled:opacity-50 disabled:bg-gray-400 rotate-180"
            aria-label="שלח פקודה"
          >
            {isLoading ? (
              <span className="animate-spin text-sm block border-2 border-t-white border-white/30 rounded-full w-5 h-5"></span>
            ) : (
              <span className="text-lg leading-none transform -translate-y-px">➤</span>
            )}
          </button>
          
          <input
            ref={inputRef}
            type="text"
            dir="rtl"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={isLoading ? "מעבד בקשה..." : "מה קרה? מה צריך לעשות?..."}
            className="flex-1 h-full bg-transparent border-none outline-none text-[#1B2A4A] mr-3 placeholder:text-[#4A5568]/50 text-base font-medium"
          />
        </div>
      </div>
    </div>
  );
}
