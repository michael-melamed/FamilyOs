'use client';

/**
 * @file components/prompt/PromptBar.tsx
 * @description_he שורת קלט עם מתג AI - זיהוי אוטומטי של קניות/משימות או פנייה לסוכן
 * @description_en Input bar with AI toggle - auto detects shopping/tasks or queries agent
 * @inputs    familyId: string, onAgentResponse: (summary: string) => void
 * @outputs   JSX input bar
 * @depends_on hooks/usePrompt.ts
 */

import { useState, useRef, useEffect } from 'react';
import { usePrompt } from '@/hooks/usePrompt';

type PromptBarProps = {
  familyId: string | undefined;
  onAgentResponse: (summary: string) => void;
};

export function PromptBar({ familyId, onAgentResponse }: PromptBarProps) {
  const [isAiMode, setIsAiMode] = useState(false);
  const { prompt, setPrompt, submit, isLoading, error } = usePrompt(familyId, isAiMode, onAgentResponse);
  const inputRef = useRef<HTMLInputElement>(null);
  const [processingPrompt, setProcessingPrompt] = useState<string | null>(null);

  useEffect(() => {
    const handleStart = (e: any) => setProcessingPrompt(e.detail);
    const handleStop = () => setProcessingPrompt(null);
    const handleClear = () => setProcessingPrompt(null);

    window.addEventListener('ai-processing-start', handleStart);
    window.addEventListener('ai-processing-stop', handleStop);
    window.addEventListener('ai-clear-all', handleClear);

    return () => {
      window.removeEventListener('ai-processing-start', handleStart);
      window.removeEventListener('ai-processing-stop', handleStop);
      window.removeEventListener('ai-clear-all', handleClear);
    };
  }, []);

  const handleAbort = () => {
    window.dispatchEvent(new CustomEvent('ai-abort'));
    setProcessingPrompt(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-3xl mx-auto w-full z-50">
      <div className="relative bottom-4 mx-4 flex flex-col gap-2">
        {error && (
          <div className="absolute -top-12 left-0 right-0 bg-red-100 text-red-600 text-sm p-2 rounded shadow text-center truncate z-40">
            {error}
          </div>
        )}

        {processingPrompt && (
          <div className="absolute -top-16 left-4 right-4 sm:left-auto sm:right-0 sm:w-80 bg-white border border-brand-purple/30 shadow-lg rounded-2xl p-3 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-4 fade-in duration-200 z-40">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 shrink-0 rounded-full bg-brand-purple/10 flex items-center justify-center">
                <span className="animate-spin block border-2 border-brand-purple border-t-transparent rounded-full w-5 h-5"></span>
              </div>
              <p className="text-sm font-medium text-calm-text truncate" dir="rtl">
                {processingPrompt}
              </p>
            </div>
            <button
              onClick={handleAbort}
              className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-full border border-red-200 hover:bg-red-100 font-medium whitespace-nowrap transition-colors"
            >
              עצור
            </button>
          </div>
        )}

        <div className={`transition-all duration-300 rounded-full p-[2px] shadow-lg focus-within:shadow-xl ${isAiMode ? 'bg-brand-gradient shadow-brand-purple/20' : 'bg-gray-200'}`}>
          <div className="flex items-center bg-white rounded-full h-14 p-1 pl-2 pr-2 gap-2">
            
            {/* Single Submit Button */}
            <button 
              type="button"
              onClick={() => submit()}
              disabled={isLoading || !prompt.trim() || !familyId}
              className={`w-11 h-11 shrink-0 text-white rounded-full flex justify-center items-center cursor-pointer transition-all disabled:opacity-50 disabled:bg-gray-300 rotate-180 ${
                isAiMode ? 'bg-brand-purple hover:opacity-90' : 'bg-slate-700 hover:bg-slate-800'
              }`}
              aria-label="שלח פקודה"
            >
              {isLoading ? (
                <span className="animate-spin text-sm block border-2 border-t-white border-white/30 rounded-full w-5 h-5"></span>
              ) : (
                <span className="text-lg leading-none transform -translate-x-[1px]">➤</span>
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
              placeholder={isLoading ? "מעבד בקשה..." : isAiMode ? "מה בא לך לעשות? (מצב AI)" : "הוסף משימה או פריט..."}
              className="flex-1 h-full bg-transparent border-none outline-none text-calm-text placeholder:text-calm-text/40 text-base font-medium min-w-0"
            />

            {/* AI Toggle Button */}
            <button
              type="button"
              onClick={() => setIsAiMode(!isAiMode)}
              className={`shrink-0 h-10 px-3 rounded-full flex items-center gap-1.5 transition-all duration-300 text-sm font-semibold ${
                isAiMode 
                  ? 'bg-gradient-to-tr from-brand-purple to-pink-500 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-brand-purple'
              }`}
              title="לחץ להפעלת/כיבוי AI"
            >
              <span>✨</span>
              <span>AI</span>
            </button>
            
          </div>
        </div>
      </div>
    </div>
  );
}
