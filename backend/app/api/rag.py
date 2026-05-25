from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.auth import AuthUser, require_user
from app.core.config import get_settings
from app.services.ai_quota import assert_user_can_chat
from app.services.ai_runtime_settings import get_ai_runtime_settings, get_message_limit_for_tier
from app.services.rag import run_rag_chat
from app.services.supabase_db import count_user_ai_messages_this_month, get_user_plan_tier
from app.services.supabase_db import get_allowed_report_ids

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
    data_mode: str = "reports"


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


def _ensure_chat_configured(user_id: str) -> None:
    settings = get_settings()
    if not settings.groq_configured:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY is not configured on the AI API.")
    allowed = get_allowed_report_ids(user_id)
    if allowed and not settings.embeddings_configured:
        raise HTTPException(
            status_code=503,
            detail="GOOGLE_API_KEY is required for report-based RAG embeddings.",
        )


@router.post(
    "/chat",
    responses={
        200: {
            "description": "JSON answer (stream=false) or SSE token stream (stream=true)",
            "content": {
                "application/json": {"schema": ChatResponse.model_json_schema()},
                "text/event-stream": {},
            },
        }
    },
)
async def chat(body: ChatRequest, user: AuthUser = Depends(require_user)):
    _ensure_chat_configured(user.id)

    history = [{"role": m.role, "content": m.content} for m in body.history if m.content.strip()][-12:]
    message = body.message.strip()

    try:
        assert_user_can_chat(user.id)
    except RuntimeError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc

    runtime = get_ai_runtime_settings()
    if not runtime.get("chat_enabled", True):
        raise HTTPException(status_code=503, detail="AI chat is disabled by an administrator.")

    try:
        if body.stream:
            gen, sources, count, data_mode = run_rag_chat(user.id, message, history=history, stream=True)
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
                            "data_mode": data_mode,
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
            data_mode=result.data_mode,
        )
    except HTTPException:
        raise
    except RuntimeError as exc:
        msg = str(exc)
        if "limit reached" in msg.lower() or "disabled" in msg.lower():
            raise HTTPException(status_code=429, detail=msg) from exc
        raise HTTPException(status_code=502, detail=_chat_error_detail(exc)) from exc
    except Exception as exc:
        logger.exception("chat failed for user %s", user.id)
        raise HTTPException(status_code=502, detail=_chat_error_detail(exc)) from exc


@router.get("/chat/limits")
def chat_limits(user: AuthUser = Depends(require_user)):
    """Monthly quota for the signed-in user (enforced on POST /chat too)."""
    tier = get_user_plan_tier(user.id)
    used = count_user_ai_messages_this_month(user.id)
    limit = get_message_limit_for_tier(tier)
    runtime = get_ai_runtime_settings()
    return {
        "chat_enabled": runtime.get("chat_enabled", True),
        "plan_tier": tier,
        "used": used,
        "limit": limit,
        "unlimited": limit is None,
    }


@router.get("/chat/health")
def chat_health():
    s = get_settings()
    runtime = get_ai_runtime_settings()
    return {
        "chat": "ready" if runtime.get("chat_enabled", True) else "disabled",
        "groq": s.groq_configured,
        "embeddings": s.embeddings_configured,
        "web_search": runtime.get("web_search_enabled_resolved", False),
        "tavily": s.tavily_configured,
        "supabase": s.supabase_configured,
        "settings_loaded": bool(s.supabase_configured),
    }
