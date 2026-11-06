# ThinkFlow: local setup

Everything here is free. You can run ThinkFlow with **no accounts at all** ("local mode"), then add AI and sign-in when you're ready.

## 1. Install

Prerequisites: Git, Node.js 20+, and [uv](https://docs.astral.sh/uv/) (`brew install uv` on macOS). uv downloads the right Python (3.13) by itself.

```bash
git clone https://github.com/ZeengFong/ThinkFlow.git
cd ThinkFlow
(cd frontend && npm install)
(cd backend && uv sync)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

## 2. Turn on the AI (free, about 2 minutes)

ThinkFlow talks to any OpenAI-compatible provider and falls back automatically when one is busy or rate-limited.

| Provider | Get a key | Put it in `backend/.env` |
|---|---|---|
| **Groq** (recommended, no card) | https://console.groq.com/keys | `GROQ_API_KEY=` |
| Google Gemini (backup, optional) | https://aistudio.google.com/apikey | `GEMINI_API_KEY=` |
| Ollama (runs on your computer) | https://ollama.com | `OLLAMA_BASE_URL=http://localhost:11434` |

The backend re-reads `backend/.env` automatically, so no restart is needed. Settings → AI shows which provider and model are active.

Free tiers have daily limits (Groq is roughly 1,000 requests/day on its big models). `AI_DAILY_LIMIT` (default 60) caps how many AI requests each student can make per day so one person can't use up the shared key.

## 3. Run

Two terminals:

```bash
cd backend && uv run uvicorn main:app --reload --port 8000
```

```bash
cd frontend && npm run dev
```

Open http://localhost:3000. Without Supabase keys you're in **local mode**: no sign-in, one built-in "Local User". The backend logs a warning so you never deploy like this by accident.

## 4. Turn on sign-in (Supabase: Google + email links)

### 4a. Supabase project
1. Create a free project at https://supabase.com/dashboard.
2. On the project home page, open the **Copy** menu (or **Project Settings → API Keys**) and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` in `frontend/.env.local` **and** `SUPABASE_URL` in `backend/.env`
   - **Publishable key** (`sb_publishable_…`) → `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `frontend/.env.local`
3. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: add `http://localhost:3000/auth/callback`
4. Restart `npm run dev` (Next.js reads `NEXT_PUBLIC_*` values at startup).

The backend verifies sign-in tokens with your project's public signing keys automatically. Only older projects on the legacy JWT secret also need `SUPABASE_JWT_SECRET` (Project Settings → JWT Keys).

### 4b. Google sign-in
1. Google Cloud: create a project at https://console.cloud.google.com/projectcreate.
2. Set up the consent screen at https://console.cloud.google.com/auth/branding (app name, support email). While the app is in "Testing", add your testers under **Audience**, or click **Publish app** to let anyone sign in.
3. **Clients → Create client → Web application** at https://console.cloud.google.com/auth/clients:
   - Authorized JavaScript origins: `http://localhost:3000` (add your Vercel URL later)
   - Authorized redirect URIs: `https://<your-project-ref>.supabase.co/auth/v1/callback` (Supabase shows this exact URL on its Google provider page)
4. Copy the **Client ID** and **Client secret** into Supabase → **Authentication → Sign In / Providers → Google**, enable it, and save.

### 4c. Email sign-in links
The email provider is on by default. Supabase's built-in email service is only for testing: it sends a few emails per hour, and only to members of your Supabase organization. For real students:
1. Create a free account at https://resend.com and verify a domain you own.
2. Supabase → **Authentication → Emails → SMTP Settings**: enable custom SMTP with Resend's host `smtp.resend.com`, port `465`, username `resend`, and your Resend API key as the password.

## 5. Tests

```bash
cd backend && uv run pytest      # API, privacy, sign-in tokens, AI planner (no network needed)
cd frontend && npm run lint && npm run build
```

## Troubleshooting

- **"Can't reach the ThinkFlow server"**: the backend isn't running on port 8000, or `NEXT_PUBLIC_API_URL` is wrong.
- **AI says it isn't set up**: `GROQ_API_KEY` is empty in `backend/.env`.
- **"Open the sign-in link in the same browser…"**: email links must be opened in the browser that requested them.
- **Sign-in redirects back to the login page**: check the Redirect URLs in Supabase (step 4a.3), and that `SUPABASE_URL` in `backend/.env` matches the frontend URL.
- **Data from local mode doesn't appear after signing in**: local-mode projects belong to the built-in local user, not your new account.
- **Database changes**: new columns are added automatically on startup. Renaming or removing columns needs a proper migration tool (not set up yet).
