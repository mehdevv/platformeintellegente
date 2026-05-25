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

| Variable | Notes |
|----------|--------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role (secret) |
| `SUPABASE_JWT_SECRET` | JWT secret (API settings) |
| `GOOGLE_API_KEY` | Google AI Studio |
| `ALLOWED_ORIGINS` | `https://your-vercel-app.vercel.app,http://localhost:5173` |

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
