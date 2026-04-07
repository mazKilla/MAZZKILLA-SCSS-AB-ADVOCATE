"""Chat endpoint — /api/chat"""
import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from bson import ObjectId

from config import (
    sessions_col, messages_col, emails_col, policy_docs_col,
    serialize_doc, utcnow,
    web_search, build_search_context,
    call_claude, call_grok,
)

router = APIRouter()

# Total character budgets per request (keeps Claude fast, avoids proxy timeouts)
MAX_EMAIL_CONTEXT_CHARS  = 32_000   # ~4 full emails at 8 k each
MAX_POLICY_CONTEXT_CHARS = 12_000   # ~2-3 policy docs
AI_TIMEOUT_SECONDS       = 120


class ChatRequest(BaseModel):
    session_id: str
    message: str
    model: str = "claude"
    search_enabled: bool = True


@router.post("/api/chat")
async def chat(req: ChatRequest):
    try:
        oid = ObjectId(req.session_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID")

    session = sessions_col.find_one({"_id": oid})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Store user message
    messages_col.insert_one({
        "session_id": req.session_id,
        "role": "user",
        "content": req.message,
        "timestamp": utcnow(),
        "model": req.model,
    })

    # Web search context
    extra_context = ""
    search_results = []
    if req.search_enabled:
        search_results = web_search(f"Alberta ETW ALSS {req.message}", max_results=4)
        extra_context = build_search_context(search_results)

    # Always include all saved email references — budget-capped to avoid proxy timeouts
    all_refs = list(emails_col.find({}, sort=[("created_at", -1)]).limit(20))
    if all_refs:
        email_context = "\n\n[EMAIL REFERENCES — Saved documents the user has uploaded for this case]\n"
        chars_used = 0
        for e in all_refs:
            if chars_used >= MAX_EMAIL_CONTEXT_CHARS:
                remaining = len(all_refs) - all_refs.index(e)
                email_context += f"\n[... {remaining} more references omitted to stay within context budget]\n"
                break
            body = (e.get("body") or "")
            # Per-ref cap: 8 000 chars, but also respect the global budget
            available = min(8000, MAX_EMAIL_CONTEXT_CHARS - chars_used)
            body_slice = body[:available]
            atts = e.get("attachments_summary", "")
            att_line = f"\nAttachments: {atts}" if atts else ""
            block = (
                f"\n--- REFERENCE: {e.get('subject', 'Untitled')} ---\n"
                f"From: {e.get('sender','')}\n"
                f"To: {e.get('recipients','')}\n"
                f"Date: {e.get('email_date','')}\n"
                f"{att_line}\n"
                f"Body:\n{body_slice}\n"
            )
            email_context += block
            chars_used += len(block)
        extra_context += email_context

    # Always include crawled policy documents — budget-capped
    all_policy = list(policy_docs_col.find({}, sort=[("crawled_at", -1)]).limit(10))
    if all_policy:
        policy_context = "\n\n[POLICY DOCUMENTS — Alberta.ca sources crawled by user]\n"
        chars_used = 0
        for pd in all_policy:
            if chars_used >= MAX_POLICY_CONTEXT_CHARS:
                break
            available = min(5000, MAX_POLICY_CONTEXT_CHARS - chars_used)
            block = (
                f"\n--- POLICY DOC: {pd.get('title', pd.get('url', 'Unknown'))} ---\n"
                f"URL: {pd.get('url','')}\n"
                f"{pd.get('content','')[:available]}\n"
            )
            policy_context += block
            chars_used += len(block)
        extra_context += policy_context

    # Call AI — with hard timeout to prevent proxy-level timeouts
    try:
        ai_coro = call_grok(req.session_id, req.message, extra_context) \
            if req.model == "grok" \
            else call_claude(req.session_id, req.message, extra_context)
        ai_response = await asyncio.wait_for(ai_coro, timeout=AI_TIMEOUT_SECONDS)
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail=f"AI response timed out after {AI_TIMEOUT_SECONDS}s. "
                   "Try a shorter message or reduce saved email references."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")

    # Ensure response is a plain string (guard against SDK objects)
    if not isinstance(ai_response, str):
        ai_response = str(ai_response)

    # Store AI response
    messages_col.insert_one({
        "session_id": req.session_id,
        "role": "assistant",
        "content": ai_response,
        "timestamp": utcnow(),
        "model": req.model,
        "citations": search_results,
    })

    # Update session
    sessions_col.update_one(
        {"_id": oid},
        {"$inc": {"message_count": 2}, "$set": {"updated_at": utcnow(), "model": req.model}},
    )

    return {
        "response": ai_response,
        "model": req.model,
        "citations": search_results,
        "session_id": req.session_id,
    }
