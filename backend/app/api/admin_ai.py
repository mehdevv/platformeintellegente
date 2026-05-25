from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.core.auth import require_staff
from app.core.config import get_settings
from app.services.ai_runtime_settings import get_ai_runtime_settings
from app.services.supabase_db import get_supabase

router = APIRouter(prefix="/v1/admin", tags=["admin-ai"])


def _month_start_iso() -> str:
    start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return start.isoformat()


@router.get("/ai/overview")
def ai_admin_overview(_staff=Depends(require_staff)):
    """Staff-only: service health + platform AI usage snapshot."""
    env = get_settings()
    runtime = get_ai_runtime_settings(force_reload=True)

    stats = {
        "conversations": 0,
        "messages": 0,
        "report_chunks": 0,
        "indexed_reports": 0,
        "ai_messages_this_month": 0,
    }
    recent_usage: list[dict] = []

    if env.supabase_configured:
        sb = get_supabase()
        since = _month_start_iso()
        stats["conversations"] = (
            sb.table("ai_conversations").select("id", count="exact", head=True).execute().count or 0
        )
        stats["messages"] = sb.table("ai_messages").select("id", count="exact", head=True).execute().count or 0
        stats["report_chunks"] = (
            sb.table("report_chunks").select("id", count="exact", head=True).execute().count or 0
        )
        stats["ai_messages_this_month"] = (
            sb.table("usage_events")
            .select("id", count="exact", head=True)
            .eq("event_type", "ai_message")
            .gte("created_at", since)
            .execute()
            .count
            or 0
        )
        chunk_rows = sb.table("report_chunks").select("report_id").limit(5000).execute().data or []
        stats["indexed_reports"] = len({str(r["report_id"]) for r in chunk_rows if r.get("report_id")})

        usage_rows = (
            sb.table("usage_events")
            .select("id, user_id, created_at, metadata")
            .eq("event_type", "ai_message")
            .order("created_at", desc=True)
            .limit(12)
            .execute()
            .data
            or []
        )
        user_ids = list({str(r["user_id"]) for r in usage_rows if r.get("user_id")})
        profiles: dict[str, str] = {}
        if user_ids:
            prof = sb.table("profiles").select("id, full_name, email").in_("id", user_ids).execute().data or []
            for p in prof:
                if p.get("id"):
                    profiles[str(p["id"])] = p.get("full_name") or p.get("email") or str(p["id"])[:8]
        for r in usage_rows:
            uid = str(r.get("user_id") or "")
            recent_usage.append(
                {
                    "id": r.get("id"),
                    "user_id": uid,
                    "user_label": profiles.get(uid, uid[:8] if uid else "—"),
                    "created_at": r.get("created_at"),
                    "metadata": r.get("metadata") or {},
                }
            )

    return {
        "services": {
            "groq": env.groq_configured,
            "embeddings": env.embeddings_configured,
            "supabase": env.supabase_configured,
            "web_search_env": env.web_search_enabled,
            "tavily": env.tavily_configured,
        },
        "settings": runtime,
        "stats": stats,
        "recent_usage": recent_usage,
    }
