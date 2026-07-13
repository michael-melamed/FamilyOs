/**
 * @file lib/agent/router.ts
 * @description_he מנוע החוקים (Smart Router) שקובע לאן הולך הטקסט שהמשתמש הזין
 * @description_en Smart Router that evaluates user input and returns the appropriate routing path
 */

export type RouteResult = {
  route: 'BLOCK' | 'AI' | 'DB';
  reason?: string;
  intent?: string;
};

// Security Blacklist Regex (without \b since it fails on Hebrew)
const BLACKLIST_REGEX = /(^|\s)(פצצה|נשק|להרוג|התעלם|prompt|ignore|system)(\s|$)/i;

// AI Intent Keywords Regex
const AI_KEYWORDS_REGEX = /(^|\s)(איך|מתכון|מצרכים|שלבים|רעיונות|המלצה|תמליץ|מה צריך|תכנון)(\s|$)/;

/**
 * Evaluates the task string and returns the routing instruction.
 * Strict hierarchy:
 * 1. Security Blacklist -> BLOCK
 * 2. Explicit AI Toggle -> AI
 * 3. Length Filter -> AI
 * 4. AI Keyword Intent -> AI
 * 5. Fallback -> DB
 */
export function evaluateTask(text: string): RouteResult {
  const trimmed = text.trim();

  // STEP 1: Security Blacklist
  if (BLACKLIST_REGEX.test(trimmed)) {
    return { route: 'BLOCK', reason: 'Security' };
  }

  // STEP 2: Explicit AI Toggles
  if (trimmed.endsWith('?') || trimmed.toLowerCase().startsWith('/ai')) {
    return { route: 'AI' };
  }

  // STEP 3: Length Filter (> 6 words)
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount > 6) {
    return { route: 'AI' };
  }

  // STEP 4: AI Keyword Intent
  if (AI_KEYWORDS_REGEX.test(trimmed)) {
    return { route: 'AI' };
  }

  // STEP 5: Check if it's a shopping item based on keywords
  const lower = trimmed.toLowerCase();
  if (/(^|\s)(קנה|קני|לקנות|סופר|חלב|לחם|ביצים)(\s|$)/.test(lower)) {
    return { route: 'DB', intent: 'Add Shopping Item' };
  }

  // STEP 6: Fallback to simple DB insert (Tasks)
  return { route: 'DB' };
}
