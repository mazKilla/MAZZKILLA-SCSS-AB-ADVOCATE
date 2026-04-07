"""Sessions CRUD — /api/sessions/*"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId

from config import sessions_col, messages_col, serialize_doc, utcnow

router = APIRouter()


class SessionCreate(BaseModel):
    title: Optional[str] = None
    model: str = "claude"


@router.get("/api/sessions")
async def list_sessions():
    docs = list(sessions_col.find({}, sort=[("created_at", -1)]).limit(100))
    return {"sessions": serialize_doc(docs)}


@router.post("/api/sessions")
async def create_session(body: SessionCreate):
    title = body.title or f"Case {datetime.now(timezone.utc).strftime('%b %d %H:%M')}"
    doc = {
        "title": title,
        "model": body.model,
        "created_at": utcnow(),
        "updated_at": utcnow(),
        "message_count": 0,
    }
    result = sessions_col.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str):
    try:
        oid = ObjectId(session_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID")
    sessions_col.delete_one({"_id": oid})
    messages_col.delete_many({"session_id": session_id})
    return {"success": True}


@router.get("/api/sessions/{session_id}/messages")
async def get_messages(session_id: str):
    from config import get_session_messages
    msgs = get_session_messages(session_id)
    return {"messages": serialize_doc(msgs)}
