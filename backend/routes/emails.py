"""Email References CRUD — /api/emails/*"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from bson import ObjectId

from config import emails_col, serialize_doc, utcnow

router = APIRouter()


class EmailCreate(BaseModel):
    subject: str
    sender: str
    recipients: str
    body: str
    email_date: Optional[str] = None
    case_id: Optional[str] = None
    tags: Optional[List[str]] = None
    attachments_summary: Optional[str] = None  # e.g. "file.pdf (12 KB), img.png (4 KB)"


@router.get("/api/emails")
async def list_emails(
    q: Optional[str] = Query(None),
    case_id: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
):
    query = {}
    if case_id:
        query["case_id"] = case_id
    if q:
        query["$or"] = [
            {"subject": {"$regex": q, "$options": "i"}},
            {"sender": {"$regex": q, "$options": "i"}},
            {"recipients": {"$regex": q, "$options": "i"}},
            {"body": {"$regex": q, "$options": "i"}},
        ]

    total = emails_col.count_documents(query)
    projection = {"subject": 1, "sender": 1, "recipients": 1, "email_date": 1, "case_id": 1, "tags": 1, "created_at": 1}
    docs = list(emails_col.find(query, projection, sort=[("email_date", -1)]).skip(offset).limit(limit))
    return {"emails": serialize_doc(docs), "total": total}


@router.post("/api/emails")
async def create_email(body: EmailCreate):
    doc = {
        "subject": body.subject,
        "sender": body.sender,
        "recipients": body.recipients,
        "body": body.body,
        "email_date": body.email_date or utcnow().isoformat(),
        "case_id": body.case_id,
        "tags": body.tags or [],
        "attachments_summary": body.attachments_summary or "",
        "created_at": utcnow(),
    }
    result = emails_col.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.get("/api/emails/{email_id}")
async def get_email(email_id: str):
    try:
        oid = ObjectId(email_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid email ID")
    doc = emails_col.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Email not found")
    return serialize_doc(doc)


@router.delete("/api/emails/{email_id}")
async def delete_email(email_id: str):
    try:
        oid = ObjectId(email_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid email ID")
    emails_col.delete_one({"_id": oid})
    return {"success": True}
