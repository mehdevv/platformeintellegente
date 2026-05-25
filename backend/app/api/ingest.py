"""
Admin / service ingest endpoints for PDF → `report_chunks`.

See docs/pdf-ingest-rag-pipeline.md and docs/fastapi-rag-railway-plan.md.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import require_staff
from app.core.config import get_settings
from app.services.pdf_pipeline import ingest_report_pdf, ingest_status

router = APIRouter(prefix="/v1", tags=["ingest"])


@router.get("/ingest/health")
def ingest_health():
    s = get_settings()
    return {"ingest": "ready", "google": s.google_configured, "supabase": s.supabase_configured}


@router.get("/reports/{report_id}/ingest/status")
def report_ingest_status(report_id: str, _staff=Depends(require_staff)):
    return ingest_status(report_id)


@router.post("/reports/{report_id}/ingest")
async def trigger_report_ingest(report_id: str, _staff=Depends(require_staff)):
    """Extract PDF text, chunk, embed into report_chunks (staff only)."""
    s = get_settings()
    if not s.google_configured:
        raise HTTPException(status_code=503, detail="GOOGLE_API_KEY is not configured.")
    if not s.supabase_configured:
        raise HTTPException(status_code=503, detail="Supabase is not configured on the AI API.")
    try:
        result = await ingest_report_pdf(report_id)
        return {
            "report_id": result.report_id,
            "chunks_written": result.chunks_written,
            "storage_updated": result.storage_updated,
            "detail": result.detail,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
