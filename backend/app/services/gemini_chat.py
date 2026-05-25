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


def _build_contents(user_message: str, history: list[dict[str, str]] | None) -> list[dict]:
    contents: list[dict] = []
    for turn in history or []:
        role = turn.get("role")
        text = (turn.get("content") or "").strip()
        if not text:
            continue
        if role == "user":
            contents.append({"role": "user", "parts": [text]})
        elif role in ("assistant", "model"):
            contents.append({"role": "model", "parts": [text]})
    contents.append({"role": "user", "parts": [user_message]})
    return contents


def _chunk_text(chunk) -> str:
    """Extract text from a streamed or complete GenerateContentResponse chunk."""
    try:
        if chunk.text:
            return chunk.text
    except (ValueError, AttributeError):
        pass
    try:
        cand = chunk.candidates[0]
        parts = cand.content.parts if cand.content else []
        return "".join(getattr(p, "text", "") or "" for p in parts)
    except (IndexError, AttributeError, TypeError):
        return ""


def _response_text(response) -> str:
    text = _chunk_text(response)
    if text.strip():
        return text.strip()
    try:
        if response.prompt_feedback and response.prompt_feedback.block_reason:
            return f"Response blocked ({response.prompt_feedback.block_reason}). Try rephrasing your question."
    except AttributeError:
        pass
    return "The model returned an empty response. Please try again."


def _create_model(system_instruction: str):
    settings = get_settings()
    return genai.GenerativeModel(
        settings.gemini_chat_model,
        system_instruction=system_instruction,
    )


def generate_answer(system_instruction: str, user_message: str, history: list[dict[str, str]] | None = None) -> str:
    _configure()
    model = _create_model(system_instruction)
    contents = _build_contents(user_message, history)
    response = model.generate_content(contents)
    return _response_text(response)


def stream_answer(system_instruction: str, user_message: str, history: list[dict[str, str]] | None = None) -> Iterator[str]:
    _configure()
    model = _create_model(system_instruction)
    contents = _build_contents(user_message, history)
    response = model.generate_content(contents, stream=True)
    for chunk in response:
        piece = _chunk_text(chunk)
        if piece:
            yield piece
