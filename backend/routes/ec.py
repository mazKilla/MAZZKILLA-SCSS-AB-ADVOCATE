"""
Email Converter — /api/ec/*
Parses .eml / .mbox / .pdf / .txt / .html / .htm / .msg → structured JSON.
"""
import email as _email_lib
import mailbox as _mailbox_lib
import zipfile
import io
import re
import base64
from email.header import decode_header as _decode_header
import email.utils as _email_utils
from datetime import timezone
from typing import List as TypingList

from fastapi import APIRouter, HTTPException, Query, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse
from bson import ObjectId

from config import ec_jobs_col, ec_emails_col, ec_attachments_col, serialize_doc, utcnow

router = APIRouter()

SUPPORTED_EXTENSIONS = {"eml", "mbox", "pdf", "txt", "text", "html", "htm", "msg"}


# ── Helpers ───────────────────────────────────────────────────────────

def _sanitize_filename(s: str) -> str:
    s = re.sub(r'[\\/:*?"<>|]', '_', s or "")
    s = re.sub(r'\s+', '_', s.strip())
    return s[:60] or "unknown"


def _generate_email_filename(dt, sender: str, subject: str) -> str:
    if dt:
        try:
            date_part = f"{dt.year}/{str(dt.day).zfill(2)}/{str(dt.month).zfill(2)}:{str(dt.hour).zfill(2)}:{str(dt.minute).zfill(2)}"
        except Exception:
            date_part = "unknown/date"
    else:
        date_part = "unknown/date"
    return f"{date_part} - {_sanitize_filename(sender)}_{_sanitize_filename(subject)}"


def _decode_header_value(val: str) -> str:
    if not val:
        return ""
    try:
        parts = _decode_header(val)
        decoded = []
        for part, enc in parts:
            if isinstance(part, bytes):
                decoded.append(part.decode(enc or "utf-8", errors="replace"))
            else:
                decoded.append(str(part))
        return " ".join(decoded)
    except Exception:
        return val


def _extract_text_from_html(html_str: str) -> str:
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html_str, "html.parser")
        for tag in soup(["script", "style"]):
            tag.decompose()
        return soup.get_text(separator="\n", strip=True)
    except Exception:
        return re.sub(r'<[^>]+>', '', html_str)


def _strip_signatures_and_quotes(text: str) -> str:
    if not text:
        return text
    lines = text.splitlines()
    clean_lines = []
    sig_patterns = re.compile(
        r'^(--|_{3,}|-{3,}|Sent from .+|Get Outlook for|This email (was sent|is confidential)|'
        r'CONFIDENTIAL|DISCLAIMER|Please consider the environment|On .+ wrote:|>'
        r'|\[cid:|-----Original Message-----).*$',
        re.IGNORECASE
    )
    in_signature = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith(">") or sig_patterns.match(stripped):
            in_signature = True
        if not in_signature:
            clean_lines.append(line)
    result = "\n".join(clean_lines).strip()
    return re.sub(r'\n{3,}', '\n\n', result)


def _extract_pdf_text(file_bytes: bytes) -> str:
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
        return f"<PDF EXTRACTION ERROR: {e}>"


def _parse_pdf_as_doc(filename: str, file_bytes: bytes) -> dict:
    body_text = _extract_pdf_text(file_bytes)
    name_no_ext = re.sub(r'\.[^.]+$', '', filename)
    now = utcnow()
    return {
        "generated_filename": f"{now.year}/{str(now.day).zfill(2)}/{str(now.month).zfill(2)}:{str(now.hour).zfill(2)}:{str(now.minute).zfill(2)} - document_{_sanitize_filename(name_no_ext)}",
        "subject": name_no_ext, "sender": "Document", "recipients": "",
        "email_date": now, "body_text": body_text,
        "has_attachments": False, "attachment_count": 0,
        "attachment_names": None, "attachments": [], "file_type": "pdf",
    }


def _parse_txt_as_doc(filename: str, file_bytes: bytes) -> dict:
    try:
        body_text = file_bytes.decode("utf-8", errors="replace").strip() or "<EMPTY FILE>"
    except Exception:
        body_text = "<DECODE ERROR>"
    name_no_ext = re.sub(r'\.[^.]+$', '', filename)
    now = utcnow()
    return {
        "generated_filename": f"{now.year}/{str(now.day).zfill(2)}/{str(now.month).zfill(2)}:{str(now.hour).zfill(2)}:{str(now.minute).zfill(2)} - document_{_sanitize_filename(name_no_ext)}",
        "subject": name_no_ext, "sender": "Document", "recipients": "",
        "email_date": now, "body_text": body_text,
        "has_attachments": False, "attachment_count": 0,
        "attachment_names": None, "attachments": [], "file_type": "txt",
    }


def _parse_single_email(msg) -> dict:
    subject = _decode_header_value(msg.get("Subject", ""))
    sender  = _decode_header_value(msg.get("From", ""))
    recipients = _decode_header_value(msg.get("To", ""))
    date_str = msg.get("Date", "")
    email_date = None
    if date_str:
        try:
            parsed_tuple = _email_utils.parsedate_tz(date_str)
            if parsed_tuple:
                ts = _email_utils.mktime_tz(parsed_tuple)
                from datetime import datetime
                email_date = datetime.fromtimestamp(ts, timezone.utc)
        except Exception:
            pass

    body_text = ""
    body_html = ""
    attachments = []

    if msg.is_multipart():
        for part in msg.walk():
            ct   = part.get_content_type()
            disp = str(part.get("Content-Disposition", ""))
            if ct == "text/plain" and "attachment" not in disp:
                try:
                    body_text += part.get_payload(decode=True).decode(
                        part.get_content_charset("utf-8") or "utf-8", errors="replace"
                    )
                except Exception:
                    pass
            elif ct == "text/html" and "attachment" not in disp and not body_text:
                try:
                    body_html = part.get_payload(decode=True).decode(
                        part.get_content_charset("utf-8") or "utf-8", errors="replace"
                    )
                except Exception:
                    pass
            elif "attachment" in disp or part.get_filename():
                fname = _decode_header_value(part.get_filename() or "attachment")
                try:
                    raw = part.get_payload(decode=True) or b""
                    attachments.append({"filename": fname, "content_type": ct, "size": len(raw), "data_base64": base64.b64encode(raw).decode("ascii")})
                except Exception:
                    attachments.append({"filename": fname, "content_type": ct, "size": 0, "data_base64": ""})
    else:
        ct = msg.get_content_type()
        try:
            payload = msg.get_payload(decode=True)
            if payload:
                text = payload.decode(msg.get_content_charset("utf-8") or "utf-8", errors="replace")
                if ct == "text/html":
                    body_html = text
                else:
                    body_text = text
        except Exception:
            pass

    if not body_text and body_html:
        body_text = _extract_text_from_html(body_html)

    clean_body = _strip_signatures_and_quotes(body_text)
    att_names  = ", ".join(a["filename"] for a in attachments) if attachments else None

    structured_json = {
        "subject": subject or "<NO SUBJECT>",
        "sender": sender or "<UNKNOWN>",
        "recipients": recipients or "",
        "date": email_date.isoformat() if email_date else None,
        "clean_body": clean_body,
        "body_word_count": len(clean_body.split()) if clean_body else 0,
        "has_attachments": len(attachments) > 0,
        "attachment_count": len(attachments),
        "attachments": [{"filename": a["filename"], "content_type": a["content_type"], "size": a["size"]} for a in attachments],
    }

    return {
        "generated_filename": _generate_email_filename(email_date, sender, subject),
        "subject": subject or "<NO SUBJECT>",
        "sender": sender or "<UNKNOWN>",
        "recipients": recipients or "",
        "email_date": email_date,
        "body_text": clean_body.strip() or "<EMPTY BODY>",
        "structured_json": structured_json,
        "has_attachments": len(attachments) > 0,
        "attachment_count": len(attachments),
        "attachment_names": att_names,
        "attachments": attachments,
    }


def _build_txt_content(email_doc: dict) -> str:
    lines = [
        f"FILE: {email_doc.get('generated_filename', 'unknown')}",
        "=" * 60,
        f"Subject:    {email_doc.get('subject', '')}",
        f"From:       {email_doc.get('sender', '')}",
        f"To:         {email_doc.get('recipients', '')}",
        f"Date:       {email_doc.get('email_date', 'Unknown')}",
    ]
    if email_doc.get("has_attachments"):
        lines.append(f"Attachments ({email_doc['attachment_count']}): {email_doc.get('attachment_names', '')}")
    lines += ["=" * 60, "", email_doc.get("body_text", "")]
    return "\n".join(lines)


async def _process_job_background(job_id: str, file_bytes: bytes, file_type: str, original_filename: str = ""):
    oid = ObjectId(job_id)
    ec_jobs_col.update_one({"_id": oid}, {"$set": {"status": "processing", "updated_at": utcnow()}})
    try:
        parsed_emails = []
        if file_type == "pdf":
            parsed_emails = [_parse_pdf_as_doc(original_filename, file_bytes)]
        elif file_type in ("txt", "text", "html", "htm"):
            parsed_emails = [_parse_txt_as_doc(original_filename, file_bytes)]
        elif file_type == "eml":
            msg = _email_lib.message_from_bytes(file_bytes, policy=_email_lib.policy.compat32)
            parsed_emails = [_parse_single_email(msg)]
        elif file_type == "mbox":
            text_content = file_bytes.decode("utf-8", errors="replace")
            from_pattern = re.compile(r'^From\s+\S+.*$', re.MULTILINE)
            splits = [s for s in from_pattern.split(text_content) if s.strip()]
            if not splits:
                splits = [text_content]
            for chunk in splits:
                try:
                    msg = _email_lib.message_from_string(
                        "From nobody\n" + chunk if not chunk.startswith("From") else chunk,
                        policy=_email_lib.policy.compat32
                    )
                    parsed = _parse_single_email(msg)
                    if parsed["subject"] != "<NO SUBJECT>" or parsed["sender"] != "<UNKNOWN>" or len(parsed["body_text"]) > 5:
                        parsed_emails.append(parsed)
                except Exception:
                    continue
        else:
            parsed_emails = [_parse_txt_as_doc(original_filename, file_bytes)]

        total = len(parsed_emails)
        ec_jobs_col.update_one({"_id": oid}, {"$set": {"total_emails": total, "updated_at": utcnow()}})

        for i, ep in enumerate(parsed_emails):
            email_doc = {
                "job_id": job_id,
                "generated_filename": ep["generated_filename"],
                "subject": ep["subject"],
                "sender": ep["sender"],
                "recipients": ep["recipients"],
                "email_date": ep["email_date"],
                "body_text": ep["body_text"],
                "structured_json": ep.get("structured_json"),
                "has_attachments": ep["has_attachments"],
                "attachment_count": ep["attachment_count"],
                "attachment_names": ep["attachment_names"],
                "created_at": utcnow(),
            }
            email_result = ec_emails_col.insert_one(email_doc)
            email_id = str(email_result.inserted_id)

            for att in ep["attachments"]:
                ec_attachments_col.insert_one({
                    "email_id": email_id,
                    "filename": att["filename"],
                    "content_type": att["content_type"],
                    "size": att["size"],
                    "data_base64": att["data_base64"],
                    "created_at": utcnow(),
                })

            ec_jobs_col.update_one({"_id": oid}, {"$set": {"processed_emails": i + 1, "updated_at": utcnow()}})

        ec_jobs_col.update_one(
            {"_id": oid},
            {"$set": {"status": "completed", "processed_emails": total, "updated_at": utcnow()}}
        )
    except Exception as e:
        ec_jobs_col.update_one(
            {"_id": oid},
            {"$set": {"status": "failed", "error_message": str(e), "updated_at": utcnow()}}
        )


# ── Routes ────────────────────────────────────────────────────────────

@router.post("/api/ec/upload")
async def ec_upload(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    filename = (file.filename or "unknown").replace("\\", "/").split("/")[-1]
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '.{ext}'. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
        )
    file_bytes = await file.read()
    job_doc = {
        "original_filename": filename, "file_type": ext, "status": "pending",
        "total_emails": 0, "processed_emails": 0, "error_message": None,
        "created_at": utcnow(), "updated_at": utcnow(),
    }
    result = ec_jobs_col.insert_one(job_doc)
    job_id = str(result.inserted_id)
    background_tasks.add_task(_process_job_background, job_id, file_bytes, ext, filename)
    job_doc["id"] = job_id
    job_doc.pop("_id", None)
    return job_doc


@router.post("/api/ec/upload-batch")
async def ec_upload_batch(background_tasks: BackgroundTasks, files: TypingList[UploadFile] = File(...)):
    results = []
    for file in files:
        filename = (file.filename or "unknown").replace("\\", "/").split("/")[-1]
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext not in SUPPORTED_EXTENSIONS:
            results.append({"filename": filename, "skipped": True, "reason": f"Unsupported type .{ext}"})
            continue
        file_bytes = await file.read()
        job_doc = {
            "original_filename": filename, "file_type": ext, "status": "pending",
            "total_emails": 0, "processed_emails": 0, "error_message": None,
            "created_at": utcnow(), "updated_at": utcnow(),
        }
        result = ec_jobs_col.insert_one(job_doc)
        job_id = str(result.inserted_id)
        background_tasks.add_task(_process_job_background, job_id, file_bytes, ext, filename)
        job_doc["id"] = job_id
        job_doc.pop("_id", None)
        results.append({"filename": filename, "job": job_doc})
    return {"results": results, "total_queued": sum(1 for r in results if not r.get("skipped"))}


@router.get("/api/ec/jobs")
async def ec_list_jobs(limit: int = Query(10, le=100), offset: int = Query(0)):
    total = ec_jobs_col.count_documents({})
    docs = list(ec_jobs_col.find({}, sort=[("created_at", -1)]).skip(offset).limit(limit))
    return {"jobs": serialize_doc(docs), "total": total}


@router.get("/api/ec/jobs/{job_id}")
async def ec_get_job(job_id: str):
    try:
        oid = ObjectId(job_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job ID")
    job = ec_jobs_col.find_one({"_id": oid})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    emails = list(ec_emails_col.find({"job_id": job_id}, sort=[("created_at", 1)]))
    return {"job": serialize_doc(job), "emails": serialize_doc(emails)}


@router.delete("/api/ec/jobs/{job_id}")
async def ec_delete_job(job_id: str):
    try:
        oid = ObjectId(job_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job ID")
    emails = list(ec_emails_col.find({"job_id": job_id}, {"_id": 1}))
    email_ids = [str(e["_id"]) for e in emails]
    if email_ids:
        ec_attachments_col.delete_many({"email_id": {"$in": email_ids}})
    ec_emails_col.delete_many({"job_id": job_id})
    ec_jobs_col.delete_one({"_id": oid})
    return {"success": True}


@router.delete("/api/ec/wipe")
async def ec_wipe_all():
    ec_attachments_col.delete_many({})
    ec_emails_col.delete_many({})
    result = ec_jobs_col.delete_many({})
    return {"success": True, "deleted_jobs": result.deleted_count}


@router.get("/api/ec/emails/{email_id}/download")
async def ec_download_email(email_id: str):
    try:
        oid = ObjectId(email_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid email ID")
    doc = ec_emails_col.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Email not found")
    content = _build_txt_content(doc)
    safe_name = re.sub(r'[^\w\-.]', '_', doc.get("generated_filename", "email"))
    return StreamingResponse(
        io.BytesIO(content.encode("utf-8")),
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}.txt"'},
    )


@router.get("/api/ec/jobs/{job_id}/export")
async def ec_export_job_zip(job_id: str):
    try:
        oid = ObjectId(job_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job ID")
    job = ec_jobs_col.find_one({"_id": oid})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    emails = list(ec_emails_col.find({"job_id": job_id}, sort=[("created_at", 1)]))

    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for em in emails:
            content = _build_txt_content(em)
            fname = re.sub(r'[^\w\-./]', '_', em.get("generated_filename", "email")) + ".txt"
            zf.writestr(fname, content)
            if em.get("has_attachments"):
                att_docs = list(ec_attachments_col.find({"email_id": str(em["_id"])}))
                for att in att_docs:
                    try:
                        att_bytes = base64.b64decode(att.get("data_base64", ""))
                        att_fname = re.sub(r'[^\w\-.]', '_', att.get("filename", "attachment"))
                        zf.writestr(f"{fname.replace('.txt', '')}_attachments/{att_fname}", att_bytes)
                    except Exception:
                        pass

    zip_buf.seek(0)
    safe_job_name = re.sub(r'[^\w\-.]', '_', job.get("original_filename", "job"))
    return StreamingResponse(
        zip_buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="CONVERTED_{safe_job_name}.zip"'},
    )


@router.get("/api/ec/emails/{email_id}/attachments")
async def ec_get_attachments(email_id: str):
    docs = list(ec_attachments_col.find({"email_id": email_id}, {"data_base64": 0}))
    return {"attachments": serialize_doc(docs)}


@router.get("/api/ec/attachments/{att_id}/download")
async def ec_download_attachment(att_id: str):
    try:
        oid = ObjectId(att_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid attachment ID")
    doc = ec_attachments_col.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Attachment not found")
    try:
        att_bytes = base64.b64decode(doc.get("data_base64", ""))
    except Exception:
        att_bytes = b""
    fname = doc.get("filename", "attachment")
    ct = doc.get("content_type", "application/octet-stream")
    return StreamingResponse(
        io.BytesIO(att_bytes),
        media_type=ct,
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )
