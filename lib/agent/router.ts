/**
 * @file lib/agent/router.ts
 * @description_he מנוע החוקים (Smart Router) שקובע לאן הולך הטקסט שהמשתמש הזין
 * @description_en Smart Router that evaluates user input and returns the appropriate routing path
 */

export type RouteResult = {
  route: 'BLOCK' | 'AI' | 'DB';
  reason?: string;
  intent?: string;
  cleanText?: string;
  assignee?: string;
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
  let trimmed = text.trim();
  let assignee: string | undefined = undefined;

  // STEP 0: Extract assignee if @Name is used
  // e.g. "@תמר להוציא את הכלב"
  const assigneeMatch = trimmed.match(/@([א-תA-Za-z0-9_]+)/);
  if (assigneeMatch) {
    assignee = assigneeMatch[1];
    trimmed = trimmed.replace(assigneeMatch[0], '').trim();
  }

  // STEP 1: Security Blacklist
  if (BLACKLIST_REGEX.test(trimmed)) {
    return { route: 'BLOCK', reason: 'Security' };
  }

  // STEP 2: Explicit AI Toggles
  if (trimmed.endsWith('?') || trimmed.toLowerCase().startsWith('/ai')) {
    return { route: 'AI', cleanText: trimmed, assignee };
  }

  // STEP 3: Explicit Tags (Prefixes / Hashtags)
  if (/^(ק:|קניות:|#קניות)\s*/.test(trimmed)) {
    return { 
      route: 'DB', 
      intent: 'Add Shopping Item', 
      cleanText: trimmed.replace(/^(ק:|קניות:|#קניות)\s*/, '').trim(),
      assignee 
    };
  }
  if (/^(מ:|משימה:|#משימות)\s*/.test(trimmed)) {
    return { 
      route: 'DB', 
      intent: 'Add Task', 
      cleanText: trimmed.replace(/^(מ:|משימה:|#משימות)\s*/, '').trim(),
      assignee 
    };
  }

  // STEP 4: Length Filter (> 6 words) -> Too complex, needs AI
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount > 6) {
    return { route: 'AI', cleanText: trimmed, assignee };
  }

  // STEP 5: AI Keyword Intent
  if (AI_KEYWORDS_REGEX.test(trimmed)) {
    return { route: 'AI', cleanText: trimmed, assignee };
  }

  // STEP 6: Shopping Heuristics
  // A. Shopping verbs at the start
  const shoppingVerbMatch = trimmed.match(/^(לקנות|תקנה|תקני|קני|קנה|להזמין|בסופר)\s+/);
  if (shoppingVerbMatch) {
    return { 
      route: 'DB', 
      intent: 'Add Shopping Item', 
      cleanText: trimmed.replace(shoppingVerbMatch[0], '').trim(),
      assignee 
    };
  }

  // B. Common grocery items (if it's a short sentence)
  const GROCERIES = /^(חלב|לחם|ביצים|עגבניות|מלפפונים|טיטולים|קוטג'|שמפו|מים|קפה|תה|סוכר|מלח|פסטה|אורז)$/;
  if (wordCount <= 3) {
    const hasGrocery = trimmed.split(/\s+/).some(word => GROCERIES.test(word));
    if (hasGrocery) {
      return { 
        route: 'DB', 
        intent: 'Add Shopping Item', 
        cleanText: trimmed,
        assignee 
      };
    }
  }

  // STEP 7: Fallback to simple DB insert (Tasks)
  return { route: 'DB', intent: 'Add Task', cleanText: trimmed, assignee };
}
