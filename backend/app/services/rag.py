from __future__ import annotations

from dataclasses import dataclass

from app.core.config import get_settings
from app.services.ai_prompts import build_reports_system_instruction, build_web_system_instruction
from app.services.ai_quota import assert_user_can_chat
from app.services.ai_runtime_settings import get_ai_runtime_settings
from app.services.embeddings import embed_query
from app.services.groq_chat import generate_answer, stream_answer
from app.services.supabase_db import get_allowed_report_ids, get_reports_titles, match_chunks
from app.services.web_search import build_web_context_and_sources


@dataclass
class RagResult:
    answer: str
    sources: list[dict]
    allowed_report_count: int
    data_mode: str = "reports"  # "reports" | "web"


def _build_context(matches: list[dict], titles: dict[str, str], max_chars: int) -> tuple[str, list[dict]]:
    parts: list[str] = []
    sources: list[dict] = []
    used = 0
    for m in matches:
        rid = str(m.get("report_id", ""))
        title = titles.get(rid, "Report")
        content = (m.get("content") or "").strip()
        if not content:
            continue
        header = f"[{title} · chunk {m.get('chunk_index', '?')}]"
        block = f"{header}\n{content}\n"
        if used + len(block) > max_chars:
            break
        parts.append(block)
        used += len(block)
        sources.append(
            {
                "source_type": "report",
                "report_id": rid,
                "report_title": title,
                "chunk_index": m.get("chunk_index"),
                "similarity": m.get("similarity"),
            }
        )
    return "\n".join(parts), sources


def _run_web_chat(message: str, history: list[dict[str, str]] | None, *, stream: bool):
    runtime = get_ai_runtime_settings()
    if not runtime.get("web_search_enabled_resolved", True):
        msg = "Web search is disabled. Add reports to your library or ask an admin to enable web search."
        if stream:

            def _off():
                yield msg

            return _off(), [], 0, "none"
        return RagResult(answer=msg, sources=[], allowed_report_count=0, data_mode="none")

    web_context, sources = build_web_context_and_sources(message)
    system = build_web_system_instruction(web_context, message)

    if stream:

        def _streaming():
            yielded = False
            for piece in stream_answer(system, message, history):
                yielded = True
                yield piece
            if not yielded:
                fallback = generate_answer(system, message, history)
                if fallback:
                    yield fallback

        return _streaming(), sources, 0, "web"

    answer = generate_answer(system, message, history)
    return RagResult(answer=answer, sources=sources, allowed_report_count=0, data_mode="web")


def run_rag_chat(
    user_id: str,
    message: str,
    *,
    history: list[dict[str, str]] | None = None,
    stream: bool = False,
):
    assert_user_can_chat(user_id)
    runtime = get_ai_runtime_settings()
    settings = get_settings()
    allowed = get_allowed_report_ids(user_id)

    if not allowed:
        if not runtime.get("web_search_enabled_resolved", True):
            msg = (
                "You do not have any reports in your library yet. "
                "Subscribe to a sector or purchase a report for PDF-based answers, "
                "or ask your admin to enable web search on the AI API."
            )
            if stream:

                def _empty():
                    yield msg

                return _empty(), [], 0, "none"
            return RagResult(answer=msg, sources=[], allowed_report_count=0, data_mode="none")

        web_result = _run_web_chat(message, history, stream=stream)
        if stream:
            gen, sources, count, mode = web_result
            return gen, sources, count, mode
        return web_result

    if not settings.embeddings_configured:
        raise RuntimeError("GOOGLE_API_KEY is required for report search embeddings.")

    query_vec = embed_query(message)
    matches = match_chunks(query_vec, allowed, runtime.get("rag_top_k", settings.rag_top_k))
    if not matches:
        msg = (
            "Your reports are not indexed for AI search yet. "
            "An admin must run “Index for AI” on each report PDF. "
            "You can still browse reports manually in your library."
        )
        if stream:

            def _empty():
                yield msg

            return _empty(), [], len(allowed), "reports"
        return RagResult(answer=msg, sources=[], allowed_report_count=len(allowed), data_mode="reports")

    report_ids_in_hits = list({str(m["report_id"]) for m in matches if m.get("report_id")})
    titles = get_reports_titles(report_ids_in_hits)
    max_ctx = runtime.get("rag_max_context_chars", settings.rag_max_context_chars)
    context_block, sources = _build_context(matches, titles, max_ctx)
    system = build_reports_system_instruction(context_block, titles)

    if stream:
        def _streaming():
            yielded = False
            for piece in stream_answer(system, message, history):
                yielded = True
                yield piece
            if not yielded:
                fallback = generate_answer(system, message, history)
                if fallback:
                    yield fallback

        return _streaming(), sources, len(allowed), "reports"

    answer = generate_answer(system, message, history)
    return RagResult(answer=answer, sources=sources, allowed_report_count=len(allowed), data_mode="reports")
