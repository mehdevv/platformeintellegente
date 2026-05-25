from __future__ import annotations

from datetime import datetime, timezone
from functools import lru_cache
from typing import Any

from supabase import Client, create_client

from app.core.config import get_settings


def _single_row_data(response: Any) -> dict[str, Any] | None:
    """Safe read for PostgREST maybe_single() — no row must not 500 the API."""
    if response is None:
        return None
    data = getattr(response, "data", None)
    return data if isinstance(data, dict) else None


@lru_cache
def get_supabase() -> Client:
    settings = get_settings()
    if not settings.supabase_configured:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def get_profile_role(user_id: str) -> str | None:
    sb = get_supabase()
    try:
        row = sb.table("profiles").select("app_role").eq("id", user_id).maybe_single().execute()
    except Exception:
        return None
    data = _single_row_data(row)
    return data.get("app_role") if data else None


def _is_active_entitlement(row: dict[str, Any]) -> bool:
    exp = row.get("expires_at")
    if not exp:
        return True
    try:
        dt = datetime.fromisoformat(str(exp).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt > datetime.now(timezone.utc)
    except (TypeError, ValueError):
        return False


def get_allowed_report_ids(user_id: str) -> list[str]:
    """Report IDs the user may use for RAG (purchases + active sector subscriptions)."""
    sb = get_supabase()
    ent = (
        sb.table("user_report_entitlements")
        .select("report_id, sector_id, expires_at")
        .eq("user_id", user_id)
        .execute()
    )
    report_ids: set[str] = set()
    sector_ids: set[str] = set()
    for row in ent.data or []:
        if not _is_active_entitlement(row):
            continue
        if row.get("report_id"):
            report_ids.add(str(row["report_id"]))
        if row.get("sector_id"):
            sector_ids.add(str(row["sector_id"]))

    if sector_ids:
        reps = (
            sb.table("reports")
            .select("id")
            .eq("status", "published")
            .in_("sector_id", list(sector_ids))
            .execute()
        )
        for r in reps.data or []:
            if r.get("id"):
                report_ids.add(str(r["id"]))

    return list(report_ids)


def get_full_pdf_path(report_id: str) -> str | None:
    sb = get_supabase()
    try:
        row = (
            sb.table("report_assets")
            .select("storage_path")
            .eq("report_id", report_id)
            .eq("asset_type", "full_pdf")
            .maybe_single()
            .execute()
        )
    except Exception:
        return None
    data = _single_row_data(row)
    if data and data.get("storage_path"):
        return str(data["storage_path"])
    return None


def download_pdf_bytes(storage_path: str) -> bytes:
    settings = get_settings()
    sb = get_supabase()
    data = sb.storage.from_(settings.report_pdfs_bucket).download(storage_path)
    if isinstance(data, bytes):
        return data
    if hasattr(data, "read"):
        return data.read()
    raise RuntimeError("Unexpected storage download response.")


def delete_report_chunks(report_id: str) -> None:
    sb = get_supabase()
    sb.table("report_chunks").delete().eq("report_id", report_id).execute()


def insert_report_chunks(rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    sb = get_supabase()
    sb.table("report_chunks").insert(rows).execute()


def count_report_chunks(report_id: str) -> int:
    sb = get_supabase()
    res = sb.table("report_chunks").select("id", count="exact").eq("report_id", report_id).execute()
    return res.count or 0


def match_chunks(query_embedding: list[float], report_ids: list[str], match_count: int) -> list[dict[str, Any]]:
    if not report_ids:
        return []
    sb = get_supabase()
    try:
        res = sb.rpc(
            "match_report_chunks",
            {
                "query_embedding": query_embedding,
                "match_count": match_count,
                "filter_report_ids": report_ids,
            },
        ).execute()
        return list(res.data or [])
    except Exception as exc:
        msg = str(exc).lower()
        if "permission" in msg or "42501" in msg or "not authorized" in msg:
            raise RuntimeError(
                "Vector search is not allowed for the AI service role. "
                "Run Supabase migration 20260531130000_fix_match_report_chunks_service_role.sql "
                "then redeploy."
            ) from exc
        raise


def get_user_plan_tier(user_id: str) -> str | None:
    sb = get_supabase()
    try:
        row = (
            sb.table("subscriptions")
            .select("plan_tier")
            .eq("user_id", user_id)
            .eq("status", "active")
            .maybe_single()
            .execute()
        )
    except Exception:
        return None
    data = _single_row_data(row)
    if data and data.get("plan_tier"):
        return str(data["plan_tier"])
    return None


def count_user_ai_messages_this_month(user_id: str) -> int:
    from datetime import datetime, timezone

    start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    sb = get_supabase()
    res = (
        sb.table("usage_events")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("event_type", "ai_message")
        .gte("created_at", start.isoformat())
        .execute()
    )
    return res.count or 0


def count_all_ai_messages_this_month() -> int:
    from datetime import datetime, timezone

    start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    sb = get_supabase()
    res = (
        sb.table("usage_events")
        .select("id", count="exact")
        .eq("event_type", "ai_message")
        .gte("created_at", start.isoformat())
        .execute()
    )
    return res.count or 0


def get_reports_titles(report_ids: list[str]) -> dict[str, str]:
    if not report_ids:
        return {}
    sb = get_supabase()
    res = sb.table("reports").select("id, title").in_("id", report_ids).execute()
    return {str(r["id"]): str(r.get("title") or "Report") for r in (res.data or []) if r.get("id")}
