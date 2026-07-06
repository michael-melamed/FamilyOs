# Agent System Rules — FamilyOS

You are an expert AI developer assistant. Before performing any code changes, read the rules and instructions in this file.

## 🎯 Project Identity
- **Name:** FamilyOS
- **Goal:** Shared family task and shopping list manager with dynamic AI-agent command-line.
- **Stack:** Next.js 14 (App Router) + Supabase (DB/Auth/Realtime) + Anthropic Claude 3.5 Sonnet API + Tailwind CSS v4 + PWA.
- **Deployment:** Vercel.

---

## 🛡️ Iron Rules
1. **README in Every Folder:** Every folder must contain a `README.md` describing its purpose, contents, and integrations. If a new folder is created, write a `README.md` first.
2. **One Layer at a Time:** Never skip layers. Complete and test Layer $N$ before starting Layer $N+1$.
3. **No UI Before API:** Create database tables and API/Server Action backend logic before building the UI components.
4. **Token Efficiency:**
   - Always read existing files before editing them (read-before-write).
   - Keep edits localized (do not replace whole files unless rewriting them from scratch is necessary).
   - Update `state.md` at the end of every task execution.

---

## 💻 Code & Quality Rules
- **TypeScript:** Use strict TypeScript. Define types/interfaces in `types/` for all entities matching the database schema.
- **Error Handling:** Use try-catch blocks in Server Actions and API routes. Return meaningful errors to the client.
- **Secrets:** Never hardcode secrets. Always use `process.env` keys.
- **Forbidden Actions:**
   - Do not delete folders or files without explicit user approval.
   - Do not install new npm packages without asking first.

---

## 📂 Project Folder Structure
```text
familyOS/
├── app/                  # Next.js 14 App Router
│   ├── (auth)/           # Authentication boundaries (login, invite)
│   ├── api/              # API Route endpoints (agent, household mutations)
│   ├── auth/             # Supabase OAuth handlers
│   ├── dashboard/        # Main app workspace
│   ├── household/        # Settings & Setup panels
│   └── join/             # Household joining by code
├── components/           # React UI components
│   ├── dashboard/        # Kanban board & list containers
│   ├── layout/           # Sidebar & Header
│   └── prompt/           # Agent Prompt bar
├── hooks/                # Custom React Hooks
├── lib/                  # Server-side logic & SDK initializers
│   ├── actions/          # DB mutations via Server Actions
│   ├── agent/            # Prompt engineering & JSON parsing logic
│   └── supabase/         # SSR and realtime initializers
├── public/               # Static assets & PWA files
├── supabase/             # DB schema & migrations
└── types/                # TypeScript interface definitions
```

---

## 🔒 Required Environment Variables
Ensure these names are defined in `.env.local` and Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_APP_URL`

---

## 📝 Task Completion Format
When completing a task, output a brief summary with:
1. **What was built/modified** (file paths)
2. **Key implementation details**
3. **Checklist verification results**
4. **Next steps according to `familyos-plan.md`**
5. **Update to `state.md`**
