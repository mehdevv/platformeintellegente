from __future__ import annotations

import time
from copy import deepcopy
from typing import Any

from app.core.config import get_settings
from app.services.supabase_db import get_supabase

AI_SETTINGS_KEY = "ai_settings"

DEFAULTS: dict[str, Any] = {
    "chat_enabled": True,
    "groq_chat_model": "",
    "temperature": 0.3,
    "rag_top_k": 8,
    "rag_max_context_chars": 24_000,
    "web_search_enabled": True,
    "web_search_max_results": 6,
    "web_search_max_context_chars": 12_000,
    "charts_enabled": True,
    "message_limits": {
        "default": 15,
        "simple": 50,
        "premium": 500,
        "corporate": None,
    },
}

_cache: dict[str, Any] = {"loaded_at": 0.0, "data": None}
_CACHE_TTL_SEC = 45


def _clamp_int(value: Any, lo: int, hi: int, fallback: int) -> int:
    try:
        n = int(value)
    except (TypeError, ValueError):
        return fallback
    return max(lo, min(hi, n))


def _clamp_float(value: Any, lo: float, hi: float, fallback: float) -> float:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return fallback
    return max(lo, min(hi, n))


def normalize_ai_settings(raw: dict[str, Any] | None) -> dict[str, Any]:
    out = deepcopy(DEFAULTS)
    if not raw:
        return out
    out["chat_enabled"] = raw.get("chat_enabled", True) is not False
    model = raw.get("groq_chat_model")
    out["groq_chat_model"] = model.strip() if isinstance(model, str) else ""
    out["temperature"] = _clamp_float(raw.get("temperature"), 0.0, 1.0, out["temperature"])
    out["rag_top_k"] = _clamp_int(raw.get("rag_top_k"), 1, 24, out["rag_top_k"])
    out["rag_max_context_chars"] = _clamp_int(
        raw.get("rag_max_context_chars"), 4000, 80_000, out["rag_max_context_chars"]
    )
    out["web_search_enabled"] = raw.get("web_search_enabled", True) is not False
    out["web_search_max_results"] = _clamp_int(
        raw.get("web_search_max_results"), 1, 12, out["web_search_max_results"]
    )
    out["web_search_max_context_chars"] = _clamp_int(
        raw.get("web_search_max_context_chars"), 2000, 40_000, out["web_search_max_context_chars"]
    )
    out["charts_enabled"] = raw.get("charts_enabled", True) is not False
    limits_in = raw.get("message_limits")
    if isinstance(limits_in, dict):
        for tier in ("default", "simple", "premium", "corporate"):
            val = limits_in.get(tier)
            if val is None or val == "":
                out["message_limits"][tier] = None if tier == "corporate" else DEFAULTS["message_limits"][tier]
            else:
                try:
                    out["message_limits"][tier] = max(0, int(val))
                except (TypeError, ValueError):
                    pass
    return out


def _load_from_db() -> dict[str, Any]:
    sb = get_supabase()
    try:
        row = sb.table("platform_settings").select("value").eq("key", AI_SETTINGS_KEY).maybe_single().execute()
    except Exception:
        return deepcopy(DEFAULTS)
    from app.services.supabase_db import _single_row_data

    data = _single_row_data(row)
    value = data.get("value") if data else None
    if not isinstance(value, dict):
        return deepcopy(DEFAULTS)
    return normalize_ai_settings(value)


def get_ai_runtime_settings(*, force_reload: bool = False) -> dict[str, Any]:
    now = time.time()
    if not force_reload and _cache["data"] is not None and now - _cache["loaded_at"] < _CACHE_TTL_SEC:
        return _cache["data"]

    env = get_settings()
    try:
        merged = _load_from_db() if env.supabase_configured else deepcopy(DEFAULTS)
    except Exception:
        merged = deepcopy(DEFAULTS)

    merged["groq_chat_model_resolved"] = (merged.get("groq_chat_model") or "").strip() or env.groq_chat_model
    merged["web_search_enabled_resolved"] = bool(
        merged.get("web_search_enabled", True) and env.web_search_enabled
    )
    _cache["data"] = merged
    _cache["loaded_at"] = now
    return merged


def get_message_limit_for_tier(plan_tier: str | None) -> int | None:
    settings = get_ai_runtime_settings()
    limits = settings.get("message_limits") or DEFAULTS["message_limits"]
    key = (plan_tier or "default").lower()
    if key not in limits:
        key = "default"
    return limits.get(key)
