# Railway deploy (FastAPI AI API)

## Fix "Application failed to respond"

That page means Railway’s proxy cannot reach your app. Almost always:

1. **Wrong root directory** — Railway built the React app (repo root) instead of FastAPI.
2. **Crash on start** — check **Deployments → View logs**.

### Required settings (service → Settings)

| Setting | Value |
|---------|--------|
| **Root Directory** | `backend` |
| **Networking** | Public domain generated |

Redeploy after changing root directory.

### Verify

Open: `https://YOUR-DOMAIN.up.railway.app/health`

Expected JSON:

```json
{"status":"ok","service":"researcha-ai"}
```

If you see HTML, Vite, or 502 → root directory or start command is still wrong.

## Variables (service → Variables tab)

Not `VITE_*` here — those go on **Vercel** for the frontend.

**Paste file (local, gitignored):** `backend/railway-variables.paste.env` — open it, copy all lines, Railway → **Variables** → **Raw Editor** → paste → deploy.

**Template (safe to commit):** `backend/railway-variables.example.env`

| Variable | Notes |
|----------|--------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role (secret) |
| `SUPABASE_JWT_SECRET` | **JWT Secret** only (API → JWT Settings). Not anon/service_role keys. |
| `SUPABASE_URL` | Required for JWKS if your project uses new asymmetric JWT signing |

### 401 "Invalid or expired session" on ingest/chat

1. Sign **out** and **in** again on the site (refresh token).
2. On Railway, confirm `SUPABASE_JWT_SECRET` is the **JWT Secret** from Supabase (Settings → API), not another key.
3. Set `SUPABASE_URL` on Railway (same as frontend) so the API can verify ES256 tokens via JWKS.
4. Redeploy the backend after changing variables.
| `GROQ_API_KEY` | [Groq Console](https://console.groq.com) — AI chat answers |
| `GOOGLE_API_KEY` | Google AI Studio — **embeddings only** (PDF index + RAG search; Groq has no embedding API) |
| `ALLOWED_ORIGINS` | `https://your-vercel-app.vercel.app,http://localhost:5173,http://localhost:5174` |

After redeploy, any `http://localhost:*` Vite port is also allowed via CORS regex. If chat still fails, add your exact dev URL to `ALLOWED_ORIGINS` on Railway.

## `VITE_AI_API_URL` (frontend only)

Copy the Railway **public domain** into:

- Local: root `.env` → `VITE_AI_API_URL=https://platformeintelligente-production.up.railway.app`
- Vercel: same name, production URL, redeploy frontend

## Repo must contain `backend/`

This monorepo layout:

```text
backend/
  Dockerfile
  railway.toml
  requirements.txt
  app/
```

Push to GitHub (`mehdevv/platformeintellegente` or your connected repo), then Railway redeploys.

## Build method

`backend/railway.toml` uses the **Dockerfile** + `start.sh` so uvicorn binds to Railway’s **`PORT`** (not a fixed 8000).

After deploy, **Deploy logs** should show:

```text
Starting Researcha AI API on 0.0.0.0:8080
```

If you only see `Starting Container` and no uvicorn line, open **Build logs** — the image may not have been built from `backend/`.
