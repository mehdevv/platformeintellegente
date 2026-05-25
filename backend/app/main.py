from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin_ai import router as admin_ai_router
from app.api.ingest import router as ingest_router
from app.api.rag import router as rag_router
from app.core.config import get_settings

app = FastAPI(title="Researcha AI API", version="0.2.0")

_settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_origins,
    # Local dev ports + Vercel deployments (preview + production)
    allow_origin_regex=r"https?://localhost(:\d+)?$|^https://[a-zA-Z0-9-]+\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest_router)
app.include_router(rag_router)
app.include_router(admin_ai_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "researcha-ai"}


@app.get("/")
def root():
    return {"message": "Researcha AI API — use /docs or /health"}
