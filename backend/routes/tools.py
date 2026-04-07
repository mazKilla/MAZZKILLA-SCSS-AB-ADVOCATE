"""
Text extraction tool — POST /api/extract-text
Used by the chat attachment button to extract text from uploaded files.
"""
import io
import re
from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter()

SUPPORTED = {"pdf", "txt", "text", "html", "htm", "eml", "mbox", "msg"}


def _extract(filename: str, file_bytes: bytes) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt"

    if ext == "pdf":
        try:
            import pdfplumber
            pages = []
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                for page in pdf.pages:
                    t = page.extract_text()
                    if t:
                        pages.append(t)
            return "\n\n".join(pages).strip() or "<EMPTY PDF>"
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"PDF extraction failed: {e}")

    if ext in ("html", "htm"):
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(file_bytes.decode("utf-8", errors="replace"), "html.parser")
            for tag in soup(["script", "style"]):
                tag.decompose()
            return soup.get_text(separator="\n", strip=True)
        except Exception:
            return re.sub(r"<[^>]+>", "", file_bytes.decode("utf-8", errors="replace"))

    if ext in ("eml", "msg"):
        try:
            import email as _email_lib
            msg = _email_lib.message_from_bytes(file_bytes, policy=_email_lib.policy.compat32)
            body = ""
            if msg.is_multipart():
                for part in msg.walk():
                    if part.get_content_type() == "text/plain":
                        raw = part.get_payload(decode=True)
                        if raw:
                            body += raw.decode(part.get_content_charset("utf-8") or "utf-8", errors="replace")
            else:
                raw = msg.get_payload(decode=True)
                if raw:
                    body = raw.decode(msg.get_content_charset("utf-8") or "utf-8", errors="replace")
            subject = msg.get("Subject", "")
            sender  = msg.get("From", "")
            header  = f"Subject: {subject}\nFrom: {sender}\n\n"
            return (header + body).strip()
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Email extraction failed: {e}")

    # Plain text / mbox
    try:
        return file_bytes.decode("utf-8", errors="replace").strip()
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Text decode failed: {e}")


@router.post("/api/extract-text")
async def extract_text(file: UploadFile = File(...)):
    filename = (file.filename or "unknown").replace("\\", "/").split("/")[-1]
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in SUPPORTED:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported type '.{ext}'. Supported: {', '.join(sorted(SUPPORTED))}"
        )
    file_bytes = await file.read()
    text = _extract(filename, file_bytes)
    return {"filename": filename, "text": text, "char_count": len(text)}
