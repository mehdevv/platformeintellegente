from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.auth import AuthUser, require_user
from app.core.config import get_settings
from app.services.rag import run_rag_chat

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


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest, user: AuthUser = Depends(require_user)):
    settings = get_settings()
    if not settings.google_configured:
        raise HTTPException(status_code=503, detail="GOOGLE_API_KEY is not configured on the AI API.")

    history = [{"role": m.role, "content": m.content} for m in body.history if m.content.strip()][-12:]

    if body.stream:
        gen, sources, count = run_rag_chat(user.id, body.message.strip(), history=history, stream=True)

        def sse():
            for piece in gen:
                payload = json.dumps({"type": "token", "text": piece})
                yield f"data: {payload}\n\n"
            meta = json.dumps({"type": "done", "sources": sources, "allowed_report_count": count})
            yield f"data: {meta}\n\n"

        return StreamingResponse(sse(), media_type="text/event-stream")

    result = run_rag_chat(user.id, body.message.strip(), history=history, stream=False)
    return ChatResponse(
        answer=result.answer,
        sources=result.sources,
        allowed_report_count=result.allowed_report_count,
    )


@router.get("/chat/health")
def chat_health():
    s = get_settings()
    return {
        "chat": "ready",
        "google": s.google_configured,
        "supabase": s.supabase_configured,
    }
