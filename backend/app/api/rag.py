from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.auth import AuthUser, require_user
from app.core.config import get_settings
from app.services.rag import run_rag_chat

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1", tags=["rag"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=8000)
    history: list[ChatMessage] = Field(default_factory=list)
    stream: bool = False


class ChatResponse(BaseModel):
    answer: str
    sources: list[dict[str, Any]]
    allowed_report_count: int


def _json_safe_sources(sources: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for s in sources:
        row = dict(s)
        if row.get("similarity") is not None:
            row["similarity"] = float(row["similarity"])
        out.append(row)
    return out


def _chat_error_detail(exc: Exception) -> str:
    detail = str(exc).strip() or exc.__class__.__name__
    return detail[:800]


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest, user: AuthUser = Depends(require_user)):
    settings = get_settings()
    if not settings.google_configured:
        raise HTTPException(status_code=503, detail="GOOGLE_API_KEY is not configured on the AI API.")

    history = [{"role": m.role, "content": m.content} for m in body.history if m.content.strip()][-12:]
    message = body.message.strip()

    try:
        if body.stream:
            gen, sources, count = run_rag_chat(user.id, message, history=history, stream=True)
            safe_sources = _json_safe_sources(sources)

            def sse():
                try:
                    for piece in gen:
                        payload = json.dumps({"type": "token", "text": piece})
                        yield f"data: {payload}\n\n"
                    meta = json.dumps(
                        {
                            "type": "done",
                            "sources": safe_sources,
                            "allowed_report_count": count,
                        }
                    )
                    yield f"data: {meta}\n\n"
                except Exception as exc:
                    logger.exception("chat stream failed for user %s", user.id)
                    err = json.dumps({"type": "error", "detail": _chat_error_detail(exc)})
                    yield f"data: {err}\n\n"

            return StreamingResponse(
                sse(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                },
            )

        result = run_rag_chat(user.id, message, history=history, stream=False)
        return ChatResponse(
            answer=result.answer,
            sources=_json_safe_sources(result.sources),
            allowed_report_count=result.allowed_report_count,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("chat failed for user %s", user.id)
        raise HTTPException(status_code=502, detail=_chat_error_detail(exc)) from exc


@router.get("/chat/health")
def chat_health():
    s = get_settings()
    return {
        "chat": "ready",
        "google": s.google_configured,
        "supabase": s.supabase_configured,
    }
