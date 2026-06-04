# 🚀 MISSION 01 — FOUNDATIONS
# משימה 01 — תשתית

> **READ BEFORE STARTING | קרא לפני שמתחיל**
> This is Mission 1 of 4. Do NOT proceed to Mission 2 until this mission is fully verified.
> זוהי משימה 1 מתוך 4. אל תמשיך למשימה 2 לפני שמשימה זו מאומתת לגמרי.

---

## 🎯 GOAL OF THIS MISSION | מטרת המשימה

Set up the complete project skeleton:
- Folder structure with README for every file and folder
- Environment variables template
- Next.js 14 base configuration
- Supabase project connection (empty, no tables yet)
- Vercel deployment ready

הגדרת שלד הפרויקט המלא:
- מבנה תיקיות עם README לכל קובץ ותיקייה
- תבנית משתני סביבה
- הגדרת בסיס Next.js 14
- חיבור לפרויקט Supabase (ריק, ללא טבלאות עדיין)
- מוכן לדפלוי ב-Vercel

---

## ✅ VERIFICATION — HOW TO KNOW THIS MISSION SUCCEEDED
## אימות — איך יודעים שהמשימה הצליחה

Before moving to Mission 2, verify ALL of these:

- [ ] `npm run dev` runs without errors on localhost:3000
- [ ] A blank page loads at `/dashboard`
- [ ] `.env.local` file exists (copied from `.env.local.example`) with real Supabase keys
- [ ] Supabase connection test passes (see test instruction below)
- [ ] Every folder has a `README.md`
- [ ] Every `.ts` / `.tsx` file has a header comment block

**Supabase connection test:**
```bash
# Run this in terminal after setup:
curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
# Expected: JSON response (not an error)
```

---

## 🛠️ PREREQUISITES — WHAT THE DEVELOPER MUST HAVE READY
## דרישות מוקדמות — מה המפתח צריך לפני שמתחיל

The developer must complete these steps MANUALLY before running this mission:

המפתח חייב להשלים את הצעדים האלה ידנית לפני הרצת המשימה:

### Step 1 — Supabase Account + Project
1. Go to https://supabase.com → Sign up (free)
2. Click "New Project"
3. Name: `familyos` | Region: closest to you
4. Wait ~2 minutes for project to initialize
5. Go to: Project Settings → API
6. Copy these values:
   - `Project URL` → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → this is your `SUPABASE_SERVICE_ROLE_KEY` ⚠️ KEEP SECRET

### Step 2 — Anthropic API Key
1. Go to https://console.anthropic.com → Sign up
2. Add a credit card (required, ~$5 minimum load)
3. Go to: API Keys → Create Key
4. Copy the key → this is your `ANTHROPIC_API_KEY` ⚠️ KEEP SECRET

### Step 3 — Vercel Account
1. Go to https://vercel.com → Sign up with GitHub
2. No further action needed now — deployment comes later

### Step 4 — Local environment
```bash
# Verify Node.js is installed (need v18+):
node --version

# Verify npm is installed:
npm --version

# Verify Git is installed (Antigravity handles this):
git --version
```

---

## 📁 REQUIRED FOLDER STRUCTURE TO CREATE
## מבנה התיקיות ליצירה

```
familyos/
├── README.md
├── .env.local.example
├── .gitignore
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
│
├── app/
│   ├── README.md
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── (auth)/
│   │   ├── README.md
│   │   ├── login/
│   │   │   ├── README.md
│   │   │   └── page.tsx
│   │   └── invite/
│   │       ├── README.md
│   │       └── page.tsx
│   └── dashboard/
│       ├── README.md
│       └── page.tsx
│
├── components/
│   ├── README.md
│   ├── layout/
│   │   ├── README.md
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   ├── dashboard/
│   │   ├── README.md
│   │   ├── Board.tsx
│   │   ├── TaskList.tsx
│   │   ├── TaskItem.tsx
│   │   └── ShoppingList.tsx
│   └── prompt/
│       ├── README.md
│       └── PromptBar.tsx
│
├── lib/
│   ├── README.md
│   ├── agent/
│   │   ├── README.md
│   │   ├── parser.ts
│   │   └── schema.ts
│   ├── supabase/
│   │   ├── README.md
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── realtime.ts
│   └── actions/
│       ├── README.md
│       ├── tasks.ts
│       └── shopping.ts
│
├── hooks/
│   ├── README.md
│   ├── useBoard.ts
│   └── usePrompt.ts
│
├── types/
│   ├── README.md
│   └── index.ts
│
└── supabase/
    ├── README.md
    └── migrations/
        ├── README.md
        └── 001_initial_schema.sql
```

---

## 📋 README STANDARD — APPLY TO EVERY FILE AND FOLDER
## תקן README — ליישם על כל קובץ ותיקייה

### For every FOLDER → create `README.md`:
```markdown
# 📁 [folder-name]/

## מה זה | What this is
[One sentence Hebrew + English]

## מה יש כאן | Contents
- `filename` — what it does

## תלויות | Depends on
[What this folder imports from]

## מי תלוי בזה | Used by
[What imports from this folder]
```

### For every `.ts` / `.tsx` FILE → add header comment:
```typescript
/**
 * @file [filename]
 *
 * @description_he [תיאור בעברית]
 * @description_en [Description in English]
 *
 * @inputs    [What this receives — props, params, env vars]
 * @outputs   [What this exports or returns]
 *
 * @depends_on   [Files this imports from]
 * @used_by      [Files that import this]
 *
 * @fix_guide
 *   - [Common problem 1]: [How to fix it]
 *   - [Common problem 2]: [How to fix it]
 *
 * @integration_guide
 *   [Step-by-step: how to connect this to another module]
 *
 * @example
 *   [Minimal working usage example]
 */
```

---

## ⚙️ KEY CONFIGURATION DETAILS
## פרטי הגדרה חשובים

### `app/layout.tsx` — MUST include:
```tsx
// RTL support for Hebrew
<html lang="he" dir="rtl">
```

### `.env.local.example` — exact content:
```
# Supabase — get from: supabase.com → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic — get from: console.anthropic.com → API Keys
ANTHROPIC_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### `.gitignore` — MUST include:
```
.env.local
.env
node_modules/
.next/
```

### `next.config.js`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000'] }
  }
}
module.exports = nextConfig
```

---

## 🚫 WHAT NOT TO DO IN THIS MISSION
## מה לא לעשות במשימה זו

- ❌ Do NOT write any database schema yet (that's Mission 2)
- ❌ Do NOT write agent logic yet (that's Mission 3)
- ❌ Do NOT build real UI yet (that's Mission 4)
- ❌ Do NOT put real API keys in any file — only in `.env.local` which is gitignored
- ❌ Do NOT skip README for any file, no matter how small

---

## 📦 PACKAGES TO INSTALL
## חבילות להתקנה

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install @anthropic-ai/sdk
npm install tailwindcss postcss autoprefixer
npm install typescript @types/node @types/react @types/react-dom
npx tailwindcss init -p
```

---

*Mission 1 of 4 | FamilyOS / LiveCode Project*
*משימה 1 מתוך 4 | פרויקט FamilyOS / לייב קוד*
