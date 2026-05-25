from __future__ import annotations

import json
from collections.abc import Iterator

import httpx

from app.core.config import get_settings
from app.services.ai_runtime_settings import get_ai_runtime_settings

GROQ_OPENAI_BASE = "https://api.groq.com/openai/v1"
_CHAT_TIMEOUT = 120.0


def _require_groq() -> None:
    if not get_settings().groq_configured:
        raise RuntimeError("GROQ_API_KEY is not configured.")


def _headers() -> dict[str, str]:
    settings = get_settings()
    return {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }


def _build_messages(
    system_instruction: str,
    user_message: str,
    history: list[dict[str, str]] | None,
) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = [{"role": "system", "content": system_instruction}]
    for turn in history or []:
        role = turn.get("role")
        text = (turn.get("content") or "").strip()
        if not text:
            continue
        if role == "user":
            messages.append({"role": "user", "content": text})
        elif role in ("assistant", "model"):
            messages.append({"role": "assistant", "content": text})
    messages.append({"role": "user", "content": user_message})
    return messages


def _extract_message_content(data: dict) -> str:
    try:
        return (data["choices"][0]["message"]["content"] or "").strip()
    except (KeyError, IndexError, TypeError):
        return ""


def _extract_delta_content(data: dict) -> str:
    try:
        return data["choices"][0]["delta"].get("content") or ""
    except (KeyError, IndexError, TypeError):
        return ""


def _raise_for_groq_error(response: httpx.Response) -> None:
    if response.is_success:
        return
    detail = response.text[:500]
    try:
        body = response.json()
        detail = body.get("error", {}).get("message", detail)
    except Exception:
        pass
    raise RuntimeError(f"Groq API error ({response.status_code}): {detail}")


def generate_answer(
    system_instruction: str,
    user_message: str,
    history: list[dict[str, str]] | None = None,
) -> str:
    _require_groq()
    settings = get_settings()
    payload = {
        "model": settings.groq_chat_model,
        "messages": _build_messages(system_instruction, user_message, history),
        "temperature": 0.3,
        "stream": False,
    }
    with httpx.Client(timeout=_CHAT_TIMEOUT) as client:
        response = client.post(
            f"{GROQ_OPENAI_BASE}/chat/completions",
            headers=_headers(),
            json=payload,
        )
        _raise_for_groq_error(response)
        data = response.json()
    text = _extract_message_content(data)
    return text or "The model returned an empty response. Please try again."


def stream_answer(
    system_instruction: str,
    user_message: str,
    history: list[dict[str, str]] | None = None,
) -> Iterator[str]:
    _require_groq()
    runtime = get_ai_runtime_settings()
    payload = {
        "model": runtime.get("groq_chat_model_resolved") or get_settings().groq_chat_model,
        "messages": _build_messages(system_instruction, user_message, history),
        "temperature": runtime.get("temperature", 0.3),
        "stream": True,
    }
    with httpx.Client(timeout=_CHAT_TIMEOUT) as client:
        with client.stream(
            "POST",
            f"{GROQ_OPENAI_BASE}/chat/completions",
            headers=_headers(),
            json=payload,
        ) as response:
            if response.status_code >= 400:
                response.read()
                _raise_for_groq_error(response)
            for line in response.iter_lines():
                if not line or not line.startswith("data: "):
                    continue
                raw = line[6:].strip()
                if raw == "[DONE]":
                    break
                try:
                    data = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                piece = _extract_delta_content(data)
                if piece:
                    yield piece
