from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.services.chunking import chunk_text
from app.services.embeddings import embed_texts
from app.services.pdf_extract import extract_text_from_pdf
from app.services.supabase_db import (
    count_report_chunks,
    delete_report_chunks,
    download_pdf_bytes,
    get_full_pdf_path,
    insert_report_chunks,
)


@dataclass
class IngestResult:
    report_id: str
    chunks_written: int
    storage_updated: bool
    detail: str


async def ingest_report_pdf(report_id: str, **_kwargs: Any) -> IngestResult:
    path = get_full_pdf_path(report_id)
    if not path:
        raise ValueError(f"No full_pdf asset for report {report_id}. Upload a PDF in admin first.")

    pdf_bytes = download_pdf_bytes(path)
    text = extract_text_from_pdf(pdf_bytes)
    if not text or len(text.strip()) < 50:
        raise ValueError("PDF text extraction yielded too little text for indexing.")

    chunks = chunk_text(text)
    if not chunks:
        raise ValueError("Chunking produced no segments.")

    vectors = embed_texts(chunks, for_query=False)
    if len(vectors) != len(chunks):
        raise RuntimeError("Embedding count mismatch.")

    delete_report_chunks(report_id)
    rows = [
        {
            "report_id": report_id,
            "chunk_index": i,
            "content": chunks[i],
            "token_count": max(1, len(chunks[i]) // 4),
            "embedding": vectors[i],
        }
        for i in range(len(chunks))
    ]
    insert_report_chunks(rows)

    return IngestResult(
        report_id=report_id,
        chunks_written=len(rows),
        storage_updated=False,
        detail=f"Indexed {len(rows)} chunks from {path}.",
    )


def ingest_status(report_id: str) -> dict[str, Any]:
    n = count_report_chunks(report_id)
    return {"report_id": report_id, "chunk_count": n, "indexed": n > 0}
