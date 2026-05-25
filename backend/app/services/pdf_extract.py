from __future__ import annotations


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract plain text from PDF bytes (PyMuPDF preferred, pypdf fallback)."""
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        parts: list[str] = []
        for page in doc:
            parts.append(page.get_text("text"))
        doc.close()
        return "\n\n".join(p.strip() for p in parts if p and p.strip())
    except ImportError:
        pass

    try:
        from io import BytesIO

        from pypdf import PdfReader

        reader = PdfReader(BytesIO(pdf_bytes))
        parts = []
        for page in reader.pages:
            t = page.extract_text() or ""
            if t.strip():
                parts.append(t.strip())
        return "\n\n".join(parts)
    except ImportError as e:
        raise RuntimeError("Install pymupdf or pypdf for PDF text extraction.") from e
