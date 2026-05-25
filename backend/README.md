# Researcha AI API (FastAPI)

Railway deploys this folder as the **root directory** of a **Web** service.

## Local run

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
copy .env.example .env          # fill variables
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Health: <http://localhost:8000/health>
- RAG chat: `POST /v1/chat` (Bearer Supabase user JWT, SSE stream)
- Ingest: `POST /v1/reports/{report_id}/ingest` (staff JWT), `GET /v1/reports/{report_id}/ingest/status`
- Docs: <http://localhost:8000/docs>

**PDF → RAG:** `docs/pdf-ingest-rag-pipeline.md` (storage + `report_chunks`). **Latency / streaming:** `docs/fastapi-rag-railway-plan.md`.

## Railway

1. New project → **Deploy from GitHub** → select this repo.
2. Service **Settings → Root Directory** → `backend` (**required**).
3. **Variables:** see `docs/railway-deploy.md` and `.env.example`.
4. Build uses `backend/Dockerfile` via `railway.toml` (uvicorn on `0.0.0.0:$PORT`).
5. **Networking → Generate Domain** → use that URL as `VITE_AI_API_URL` on Vercel.

If you see **Application failed to respond**, read `docs/railway-deploy.md`.

## CORS

Set `ALLOWED_ORIGINS` to your Vercel URL(s), e.g. `https://yourapp.vercel.app,http://localhost:5173`.
