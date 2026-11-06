"""
PDF upload: extracts the text with pdfplumber and appends it to the
project's context, so the AI can plan from the assignment brief / syllabus.
"""

from __future__ import annotations

import io

import pdfplumber
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from db_models import User
from routes.common import owned_project

router = APIRouter()

MAX_PDF_BYTES = 20 * 1024 * 1024  # 20 MB
MAX_PAGES = 200


@router.post("/{project_id}/upload-pdf")
async def upload_pdf(
    project_id: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = owned_project(db, user, project_id)

    filename = (file.filename or "document.pdf")[:200]
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="The uploaded file is empty")
    if len(data) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="PDF is larger than 20 MB")
    if not data.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="That file is not a PDF")

    try:
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            pages = [page.extract_text() or "" for page in pdf.pages[:MAX_PAGES]]
    except Exception as exc:  # pdfplumber raises a variety of parser errors
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {exc}")

    text = "\n\n".join(p.strip() for p in pages if p.strip())
    if not text:
        raise HTTPException(
            status_code=422,
            detail="No text could be extracted (the PDF may be scanned images).",
        )

    section = f"--- From {filename} ---\n{text}"
    project.context = f"{project.context.rstrip()}\n\n{section}" if project.context else section
    db.commit()

    return {"success": True, "filename": filename, "extracted_length": len(text)}
