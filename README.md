# Ayan, Tamjeed, Alec-franz, Luca, Mudit

---

# ThinkFlow 🧠🌊

A **Calgary Hacks 2026** project that turns big, fuzzy assignments into clear, scheduled steps, using free AI and a visual flow.

> **Think flowier, act like a plan.**

---

## 🚀 What it does

- **AI builds your plan.** Describe an assignment, exam or goal (or upload the PDF brief/syllabus) and ThinkFlow lays out every step and sub-step, with time estimates and due dates scheduled before your deadline.
- **Visual flow.** The whole plan on one map: the project on top, main steps as columns, sub-steps underneath. Click ✨ on any step to break it down further, or tidy the layout in one click.
- **Every step is a task.** Check things off on the canvas, the checklist, the dashboard or the calendar. Rename (double-click), reprioritise and set due dates anywhere; it all stays in sync.
- **An assistant that knows your project.** Chat about what to do today, how to study, or where you're stuck. When it suggests steps, add them to the flow in one click. History is saved per project.
- **Dashboard and calendar.** "Next up", overdue, today and this week across every project, plus deadlines on a calendar.
- **Real accounts.** Sign in with Google or an emailed link; each student only sees their own data.
- **Works on phones**, in light and dark mode.
- **Free to run.** Groq's free AI tier (Gemini as automatic backup), Supabase, Render and Vercel free tiers.

## ⚡ Quick start (local, no accounts needed)

```bash
git clone https://github.com/ZeengFong/ThinkFlow.git && cd ThinkFlow
(cd frontend && npm install) && (cd backend && uv sync)
cp backend/.env.example backend/.env && cp frontend/.env.example frontend/.env.local
```

Add a free Groq key (https://console.groq.com/keys) to `backend/.env` as `GROQ_API_KEY`, then in two terminals:

```bash
cd backend && uv run uvicorn main:app --reload --port 8000
```

```bash
cd frontend && npm run dev
```

Open http://localhost:3000.

- **Full setup** (AI providers, Google + email sign-in, tests): [SETUP.md](SETUP.md)
- **Put it online for free** (Supabase + Render + Vercel): [DEPLOY.md](DEPLOY.md)

## 📂 Project structure

```text
ThinkFlow/
├── backend/                 FastAPI + SQLAlchemy (SQLite locally, Postgres in production)
│   ├── main.py              app entry, CORS, routers
│   ├── auth.py              Supabase JWT verification, per-user accounts
│   ├── ai/                  free LLM providers with fallback, prompts, flow planner, quotas
│   ├── routes/              projects, flows (+ node↔task sync), tasks, AI, PDF upload, me
│   └── tests/               pytest suite (no network needed)
├── frontend/                Next.js 16 + React 19 + Tailwind 4 + React Flow
│   └── src/
│       ├── app/             pages: home, projects, flow/[id], calendar, settings, login
│       ├── components/flow/ canvas nodes, layout, AI chat, checklist, dialogs
│       └── lib/             API client, auth, formatting, theme, toasts
├── render.yaml              Render blueprint for the backend
├── SETUP.md / DEPLOY.md     guides
└── README.md
```

## 📦 Tech stack

**Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, React Flow (XYFlow), TanStack Query, Zustand, Framer Motion, Supabase Auth, Lucide.

**Backend:** Python 3.13, FastAPI, SQLAlchemy, SQLite/Postgres (psycopg), OpenAI-compatible SDK (Groq, Gemini, Ollama, OpenAI), PyJWT, pdfplumber, pytest.

## 👥 Contributors

- **Ayan**
- **Tamjeed**
- **Alec-franz**
- **Luca**
- **Mudit**

---

Built with ❤️ for **Calgary Hacks 2026**

*Think flowier, act like a plan.*
