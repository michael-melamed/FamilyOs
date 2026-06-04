# 🗂️ FamilyOS — Mission Pack

**Project:** FamilyOS — Family Task & Agent Manager  
**Built for:** LiveCode / מיכאל מלמד  
**Stack:** Next.js 14 (App Router) + Supabase + Claude API + Tailwind CSS v4

---

## 🎯 About

FamilyOS is an intelligent, realtime-connected family management application. It features a persistent dashboard displaying tasks and shopping links, synchronized instantly across devices using Supabase Realtime subscriptions.

The core differentiator is the **Agent Core (Claude 3.5)** natively plugged into the prompt bar. By providing natural language tasks (in Hebrew or English), Claude reads the state, remembers historical family notes, and modifies the database directly using `Server Actions` through a structured JSON parser. 

## 📂 Architecture

```text
familyOS/
├── app/                  # Next.js 14 App Router
│   ├── (auth)/login      # Google OAuth login boundary
│   ├── api/agent/        # Core Anthropic execution proxy
│   ├── auth/callback     # Supabase Google Auth redirect handler
│   └── dashboard/        # Main interactive workspace
├── components/           # React UI bounds
│   ├── dashboard/        # Board, TaskList, TaskItem, ShoppingList 
│   ├── layout/           # Sidebar, Header
│   └── prompt/           # Bottom fixed PromptBar 
├── hooks/                # Client-Side logic mapping
│   ├── useBoard.ts       # Realtime task & shopping syncing
│   └── usePrompt.ts      # Agent Request dispatching
├── lib/                  # Native server logic & APIs
│   ├── actions/          # DB mutations (tasks, memory, families)
│   ├── agent/            # Prompt builder and JSON execution parsing
│   └── supabase/         # SSR and Realtime clients
└── types/                # Strict TypeScript structural definitions
```

## 🚀 How to Run Locally

### 1. Prerequisites
- **Supabase Account** (Database & Auth structure)
- **Anthropic Account** (Claude AI API key with positive billing credit)
- **Node.js v18+**

### 2. Environment Setup
Copy the example config and fill in the values:
```bash
cp .env.example .env.local
```

### 3. Install & Start
```bash
npm install
```
```bash
npm run dev
```
The application will launch on `http://localhost:3000`. You will be immediately redirected to the login page thanks to Next.js middleware.

## ✨ Features Currently Working
- **Full Auth Flow:** Google OAuth via Supabase perfectly secured in middleware. Auto-generates families on the first login.
- **Native AI Parsing:** Claude successfully transforms free-text like "I bought milk" or "Remind me to call Grandma" into active database states.
- **Offline Fallback:** If Claude is down, a hard-coded parser gracefully catches keywords ("קנה", "סיימתי") to execute actions immediately.
- **Realtime UI:** The Board organically pulses and updates exactly when another family member dictates a task.
- **Family Memory:** Edit and load context arrays straight from the Sidebar to give the Agent persistent family knowledge.

## 🔜 Coming Next
- Push notification integrations
- Voice-dictated prompt support (Premium Tier Features)
- Extended family tracking views
