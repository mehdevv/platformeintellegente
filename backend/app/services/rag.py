from __future__ import annotations

from dataclasses import dataclass

from app.core.config import get_settings
from app.services.embeddings import embed_query
from app.services.gemini_chat import build_rag_system_instruction, generate_answer, stream_answer
from app.services.supabase_db import get_allowed_report_ids, get_reports_titles, match_chunks


@dataclass
class RagResult:
    answer: str
    sources: list[dict]
    allowed_report_count: int


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
                "report_id": rid,
                "report_title": title,
                "chunk_index": m.get("chunk_index"),
                "similarity": m.get("similarity"),
            }
        )
    return "\n".join(parts), sources


def run_rag_chat(
    user_id: str,
    message: str,
    *,
    history: list[dict[str, str]] | None = None,
    stream: bool = False,
):
    settings = get_settings()
    allowed = get_allowed_report_ids(user_id)
    if not allowed:
        msg = (
            "You do not have any reports in your library yet. "
            "Subscribe to a sector or purchase a report, then ask questions about that content."
        )
        if stream:

            def _empty():
                yield msg

            return _empty(), [], 0
        return RagResult(answer=msg, sources=[], allowed_report_count=0)

    query_vec = embed_query(message)
    matches = match_chunks(query_vec, allowed, settings.rag_top_k)
    if not matches:
        msg = (
            "Your reports are not indexed for AI search yet. "
            "An admin must run “Index for AI” on each report PDF, or contact support."
        )
        if stream:

            def _empty():
                yield msg

            return _empty(), [], len(allowed)
        return RagResult(answer=msg, sources=[], allowed_report_count=len(allowed))

    report_ids_in_hits = list({str(m["report_id"]) for m in matches if m.get("report_id")})
    titles = get_reports_titles(report_ids_in_hits)
    context_block, sources = _build_context(matches, titles, settings.rag_max_context_chars)
    system = build_rag_system_instruction(context_block, titles)

    if stream:
        return stream_answer(system, message, history), sources, len(allowed)

    answer = generate_answer(system, message, history)
    return RagResult(answer=answer, sources=sources, allowed_report_count=len(allowed))
