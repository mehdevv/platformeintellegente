from __future__ import annotations

import google.generativeai as genai

from app.core.config import get_settings

_TASK_DOCUMENT = "retrieval_document"
_TASK_QUERY = "retrieval_query"


def _configure() -> None:
    settings = get_settings()
    if not settings.google_configured:
        raise RuntimeError("GOOGLE_API_KEY is not configured.")
    genai.configure(api_key=settings.google_api_key)


def embed_texts(texts: list[str], *, for_query: bool = False) -> list[list[float]]:
    if not texts:
        return []
    _configure()
    settings = get_settings()
    task_type = _TASK_QUERY if for_query else _TASK_DOCUMENT
    vectors: list[list[float]] = []
    # Batch one at a time for compatibility; batch API can be added later.
    for text in texts:
        result = genai.embed_content(
            model=settings.gemini_embedding_model,
            content=text,
            task_type=task_type,
            output_dimensionality=settings.embedding_dimensions,
        )
        emb = result.get("embedding") if isinstance(result, dict) else getattr(result, "embedding", None)
        if emb is None:
            raise RuntimeError("Embedding API returned no vector.")
        vectors.append([float(x) for x in emb])
    return vectors


def embed_query(text: str) -> list[float]:
    return embed_texts([text], for_query=True)[0]
