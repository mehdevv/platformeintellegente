from __future__ import annotations

from collections.abc import Iterator

import google.generativeai as genai

from app.core.config import get_settings


def _configure() -> None:
    settings = get_settings()
    if not settings.google_configured:
        raise RuntimeError("GOOGLE_API_KEY is not configured.")
    genai.configure(api_key=settings.google_api_key)


def build_rag_system_instruction(context_block: str, report_titles: dict[str, str]) -> str:
    titles = ", ".join(report_titles.values()) if report_titles else "the user's entitled reports"
    return f"""You are Researcha AI, a market-research assistant for a paid report platform.

Rules:
- Answer ONLY using the provided report excerpts below. If the excerpts do not contain enough information, say so clearly.
- Do not invent statistics, dates, or sources.
- When you rely on a passage, mention which report it came from when possible.
- Be concise and structured (bullets or short sections when helpful).

Reports in context: {titles}

--- Report excerpts ---
{context_block}
--- End excerpts ---
"""


def generate_answer(system_instruction: str, user_message: str, history: list[dict[str, str]] | None = None) -> str:
    _configure()
    settings = get_settings()
    model = genai.GenerativeModel(
        settings.gemini_chat_model,
        system_instruction=system_instruction,
    )
    contents = []
    for turn in history or []:
        role = turn.get("role")
        text = turn.get("content", "")
        if role == "user":
            contents.append({"role": "user", "parts": [text]})
        elif role == "assistant":
            contents.append({"role": "model", "parts": [text]})
    contents.append({"role": "user", "parts": [user_message]})
    response = model.generate_content(contents)
    return (response.text or "").strip()


def stream_answer(system_instruction: str, user_message: str, history: list[dict[str, str]] | None = None) -> Iterator[str]:
    _configure()
    settings = get_settings()
    model = genai.GenerativeModel(
        settings.gemini_chat_model,
        system_instruction=system_instruction,
    )
    contents = []
    for turn in history or []:
        role = turn.get("role")
        text = turn.get("content", "")
        if role == "user":
            contents.append({"role": "user", "parts": [text]})
        elif role == "assistant":
            contents.append({"role": "model", "parts": [text]})
    contents.append({"role": "user", "parts": [user_message]})
    for chunk in model.generate_content(contents, stream=True):
        if chunk.text:
            yield chunk.text
