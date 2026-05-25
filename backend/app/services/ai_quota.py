from __future__ import annotations

from app.services.ai_runtime_settings import get_ai_runtime_settings, get_message_limit_for_tier
from app.services.supabase_db import count_user_ai_messages_this_month, get_user_plan_tier


def assert_user_can_chat(user_id: str) -> dict:
    """Raise RuntimeError if chat disabled or monthly quota exceeded. Returns usage snapshot."""
    settings = get_ai_runtime_settings()
    if not settings.get("chat_enabled", True):
        raise RuntimeError("AI chat is temporarily disabled by an administrator.")

    tier = get_user_plan_tier(user_id)
    limit = get_message_limit_for_tier(tier)
    used = count_user_ai_messages_this_month(user_id)

    if limit is not None and used >= limit:
        label = tier or "free"
        raise RuntimeError(
            f"Monthly AI message limit reached ({used}/{limit} for {label} plan). "
            "Upgrade your subscription or wait until next month."
        )

    return {"used": used, "limit": limit, "plan_tier": tier}
