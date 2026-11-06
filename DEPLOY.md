# Deploying ThinkFlow (free)

| Piece | Free host | What it runs |
|---|---|---|
| Database + sign-in | **Supabase** | Postgres and Auth (Google + email links) |
| Backend | **Render** | FastAPI (`backend/`), via `render.yaml` |
| Frontend | **Vercel** | Next.js (`frontend/`) |

Do the steps in this order. Finish [SETUP.md](SETUP.md) step 4 (Supabase + Google) first.

## 1. Database: Supabase Postgres
1. In your Supabase project click **Connect** and copy the **Session pooler** connection string. It works over IPv4, which Render needs; the "Direct connection" string is IPv6-only.
2. Replace `[YOUR-PASSWORD]` with your database password. This full string is your `DATABASE_URL`. Treat it like a password.

ThinkFlow creates its tables on first start.

## 2. Backend: Render
1. Push this repo to GitHub.
2. Render dashboard → **New → Blueprint** → choose the repo. Render reads `render.yaml` and creates `thinkflow-api`.
3. Fill in the environment variables it asks for:
   - `DATABASE_URL`: from step 1
   - `SUPABASE_URL`: `https://<project-ref>.supabase.co`
   - `GROQ_API_KEY` (and optionally `GEMINI_API_KEY`)
   - `FRONTEND_ORIGIN`: leave as `http://localhost:3000` for now and fix it in step 4
4. Deploy, then open `https://<your-service>.onrender.com/health`. It should say `"auth": "supabase"`.

The free tier sleeps after about 15 minutes idle, so the next visit takes up to a minute to wake it. ThinkFlow shows a "Waking up the server…" banner while that happens.

## 3. Frontend: Vercel
1. Vercel → **Add New → Project** → import the repo.
2. **Root Directory: `frontend`** (the framework is detected as Next.js).
3. Environment variables:
   - `NEXT_PUBLIC_API_URL`: your Render URL, e.g. `https://thinkflow-api.onrender.com`
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://<project-ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: your publishable key
4. Deploy and note the URL, e.g. `https://thinkflow.vercel.app`.

## 4. Connect the pieces
- **Render** → `FRONTEND_ORIGIN` = your Vercel URL (no trailing slash). Save; Render redeploys.
- **Supabase → Authentication → URL Configuration**: set Site URL to the Vercel URL, and add `https://<vercel-url>/auth/callback` to Redirect URLs (keep the localhost one for development).
- **Google Cloud → your OAuth client**: add the Vercel URL to Authorized JavaScript origins. The redirect URI (the Supabase callback) stays the same.
- **Google consent screen**: click **Publish app** so any student can sign in, not just test users.

Then open the Vercel URL, sign in, create a project and click **Build my plan with AI**.

## Environment variables

**Backend (Render or `backend/.env`)**

| Variable | Required | Notes |
|---|---|---|
| `GROQ_API_KEY` | yes, for AI | free at console.groq.com |
| `GEMINI_API_KEY` | no | backup AI provider |
| `OPENAI_API_KEY`, `OLLAMA_BASE_URL` | no | more providers |
| `AI_PROVIDERS` | no | order to try, default `groq,gemini,openai,ollama` |
| `GROQ_MODEL`, `GEMINI_MODEL`, … | no | pin a model; otherwise picked from the provider's live list |
| `AI_DAILY_LIMIT` | no | AI requests per student per day, default 60 (0 = unlimited) |
| `SUPABASE_URL` | yes in production | empty = local mode (no sign-in): never deploy that way |
| `SUPABASE_JWT_SECRET` | only legacy projects | for projects still on the HS256 JWT secret |
| `DATABASE_URL` | yes in production | default is a local SQLite file |
| `FRONTEND_ORIGIN` | yes in production | allowed browser origin(s), comma-separated |

**Frontend (Vercel or `frontend/.env.local`)**

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_API_URL` | backend URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable key (safe in the browser) |

## Limits to know about
- Free-tier AI quotas are shared by everyone using your deployment. Raise or lower `AI_DAILY_LIMIT`, add a `GEMINI_API_KEY` as backup, or add a paid key later.
- Supabase pauses free projects after about a week with no activity; un-pause from the dashboard.
- After changing backend dependencies, run `uv export --no-dev --no-hashes --no-emit-project -o requirements.txt` in `backend/` so Render installs the same versions.
