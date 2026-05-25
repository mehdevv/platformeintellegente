from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import get_settings
from app.services.ai_runtime_settings import get_ai_runtime_settings

logger = logging.getLogger(__name__)


def _tavily_search(query: str, max_results: int) -> list[dict[str, Any]]:
    settings = get_settings()
    with httpx.Client(timeout=25.0) as client:
        res = client.post(
            "https://api.tavily.com/search",
            json={
                "api_key": settings.tavily_api_key,
                "query": query,
                "max_results": max_results,
                "search_depth": "basic",
                "include_answer": True,
            },
        )
        res.raise_for_status()
        body = res.json()
    out: list[dict[str, Any]] = []
    if body.get("answer"):
        out.append(
            {
                "title": "Tavily summary",
                "url": "",
                "snippet": str(body["answer"]),
            }
        )
    for r in body.get("results") or []:
        out.append(
            {
                "title": r.get("title") or "Web result",
                "url": r.get("url") or "",
                "snippet": r.get("content") or r.get("snippet") or "",
            }
        )
    return out[:max_results]


def _duckduckgo_search(query: str, max_results: int) -> list[dict[str, Any]]:
    try:
        from duckduckgo_search import DDGS
    except ImportError as exc:
        raise RuntimeError("duckduckgo-search package is not installed on the AI API.") from exc

    rows: list[dict[str, Any]] = []
    with DDGS() as ddgs:
        for item in ddgs.text(query, max_results=max_results):
            rows.append(
                {
                    "title": item.get("title") or "Web result",
                    "url": item.get("href") or item.get("link") or "",
                    "snippet": item.get("body") or item.get("snippet") or "",
                }
            )
    return rows


def search_web(query: str, max_results: int | None = None) -> list[dict[str, Any]]:
    settings = get_settings()
    runtime = get_ai_runtime_settings()
    if not runtime.get("web_search_enabled_resolved", True):
        return []
    limit = max_results or runtime.get("web_search_max_results", settings.web_search_max_results)
    try:
        if settings.tavily_configured:
            return _tavily_search(query, limit)
        return _duckduckgo_search(query, limit)
    except Exception:
        logger.exception("web search failed for query=%s", query[:80])
        return []


def build_web_context_and_sources(query: str) -> tuple[str, list[dict[str, Any]]]:
    """Format search hits for the LLM and UI source chips."""
    runtime = get_ai_runtime_settings()
    hits = search_web(query)
    if not hits:
        return (
            "No web results were returned. Explain limits and suggest the user add reports to their library.",
            [],
        )

    parts: list[str] = []
    sources: list[dict[str, Any]] = []
    for i, hit in enumerate(hits, start=1):
        title = (hit.get("title") or f"Source {i}").strip()
        url = (hit.get("url") or "").strip()
        snippet = (hit.get("snippet") or "").strip()[:1200]
        parts.append(f"[{i}] {title}\nURL: {url or 'n/a'}\n{snippet}\n")
        sources.append(
            {
                "source_type": "web",
                "report_title": title,
                "title": title,
                "url": url or None,
            }
        )

    block = "\n".join(parts)
    max_chars = runtime.get("web_search_max_context_chars", get_settings().web_search_max_context_chars)
    if len(block) > max_chars:
        block = block[:max_chars] + "\n…(truncated)"
    return block, sources
