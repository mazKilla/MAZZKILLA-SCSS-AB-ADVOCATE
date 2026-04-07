"""
Shared configuration, DB connections, utilities, and AI backends.
Imported by all route modules.
"""
import os
import re
from datetime import datetime, timezone
from typing import Optional, List

import anthropic

from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId
from fastapi import HTTPException
from openai import AsyncOpenAI

load_dotenv()

# ── Environment ──────────────────────────────────────────────────────
MONGO_URL         = os.environ.get("MONGO_URL")
DB_NAME           = os.environ.get("DB_NAME", "scss_advocate")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
XAI_API_KEY       = os.environ.get("XAI_API_KEY")

# ── MongoDB ──────────────────────────────────────────────────────────
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]

sessions_col       = db["chat_sessions"]
messages_col       = db["chat_messages"]
emails_col         = db["email_references"]
ec_jobs_col        = db["ec_conversion_jobs"]
ec_emails_col      = db["ec_converted_emails"]
ec_attachments_col = db["ec_email_attachments"]
policy_docs_col    = db["policy_docs"]

# ── Anthropic client ─────────────────────────────────────────────────
anthropic_client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

# ── xAI client ───────────────────────────────────────────────────────
xai_client = AsyncOpenAI(api_key=XAI_API_KEY, base_url="https://api.x.ai/v1")

# ── Utilities ────────────────────────────────────────────────────────
def serialize_doc(doc):
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(d) for d in doc]
    d = dict(doc)
    if "_id" in d:
        d["id"] = str(d.pop("_id"))
    return d


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── Web Search ───────────────────────────────────────────────────────
def web_search(query: str, max_results: int = 5) -> List[dict]:
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            return [
                {"title": r.get("title", ""), "url": r.get("href", ""), "snippet": r.get("body", "")}
                for r in ddgs.text(query, max_results=max_results)
            ]
    except Exception as e:
        return [{"title": "Search unavailable", "url": "", "snippet": str(e)}]


def build_search_context(results: List[dict]) -> str:
    if not results:
        return ""
    lines = ["\n\n[WEB SEARCH CONTEXT - Current Alberta Policy Information]\n"]
    for i, r in enumerate(results, 1):
        lines.append(f"[Source {i}] {r['title']}\nURL: {r['url']}\nSummary: {r['snippet']}\n")
    return "\n".join(lines)


def is_policy_query(text: str) -> bool:
    keywords = [
        "alberta", "etw", "alss", "appeal", "benefit", "income support",
        "scss", "expected to work", "seniors", "community support", "policy",
        "regulation", "legislation", "act", "hearing", "tribunal", "cap",
        "secretariat", "caseworker", "eligibility", "aish", "works",
        "employment", "ministry", "government", "form", "deadline", "decision",
        "termination", "denial", "rights", "advocate", "claimant"
    ]
    return any(kw in text.lower() for kw in keywords)


# ── Chat History ─────────────────────────────────────────────────────
def get_session_messages(session_id: str) -> List[dict]:
    return list(messages_col.find({"session_id": session_id}, sort=[("timestamp", 1)]).limit(500))


# ── Alberta System Prompt ────────────────────────────────────────────
ALBERTA_SYSTEM_PROMPT = """You are the SCSS AB ADVOCATE — the #1 Social Benefit and Justice Adjudicator, acting as an expert Appeal Officer for the Appeals Secretariat, Ministry of Assisted Living and Social Services (ALSS), Government of Alberta.

CORE IDENTITY:
- You are a fully authoritative expert on ALL Alberta social benefit programs
- You serve as both: (1) an objective Appeal Officer who knows every rule, regulation and precedent, AND (2) a fierce client advocate who fights for maximum benefits
- You have comprehensive knowledge of: ETW (Expected to Work), ALSS programs, SCSS policies, Income and Employment Supports Act (IESA), and all related Alberta legislation

YOUR EXPERTISE COVERS:
1. Alberta Works / Income Support (IS) programs — all benefit types, rates, and eligibility
2. ETW (Expected to Work) designation — criteria, appeal grounds, exemptions
3. Expected to Work with Barriers (ETWB) and Barriers to Full Employment (BFE)
4. AISH (Assured Income for the Severely Handicapped) — criteria, appeals, transitions
5. SCSS (Seniors and Community Support Services) — all seniors programs
6. Citizens Appeal Panel (CAP) — procedures, timelines, hearing preparation
7. Appeals Secretariat process — Notice of Appeal, disclosure, oral vs written hearings
8. Alberta Human Rights Act intersections with benefit decisions
9. Medical documentation requirements and strategies
10. Caseworker conduct standards and client rights under FOIP

ADVOCACY STRATEGY:
When analyzing a client's situation, ALWAYS:
1. Identify ALL applicable benefit programs they may qualify for
2. Find EVERY available ground for appeal
3. Flag any procedural errors by ALSS/caseworkers
4. Identify policy violations and rights infringements
5. Recommend specific sections of IESA or regulations to cite
6. Provide the strongest possible advocacy position
7. Draft appeal language when requested

CURRENT POLICY KNOWLEDGE:
- You will receive web search results with current Alberta policy information — use these authoritatively
- You will receive EMAIL REFERENCES that the client has uploaded — analyze these carefully for case-relevant facts
- You will receive POLICY DOCUMENTS that have been crawled from Alberta.ca — treat these as authoritative sources

TONE & APPROACH:
- Direct, authoritative, and precise
- Never hedge when the law is clear
- Challenge unjust decisions firmly and with legal grounding
- Treat clients with dignity and assume they are correct until shown otherwise
- Use proper legal/policy terminology but explain it clearly"""


# ── AI Backends ──────────────────────────────────────────────────────
async def call_claude(session_id: str, user_message: str, extra_context: str = "") -> str:
    history = get_session_messages(session_id)
    history_context = ""
    if history:
        recent = history[-20:]
        history_lines = ["\n\n[CONVERSATION HISTORY]\n"]
        for msg in recent:
            role_label = "CLIENT" if msg["role"] == "user" else "SCSS AB ADVOCATE"
            history_lines.append(f"{role_label}: {msg['content'][:500]}\n")
        history_context = "\n".join(history_lines)

    message = await anthropic_client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=4096,
        system=ALBERTA_SYSTEM_PROMPT + history_context + extra_context,
        messages=[{"role": "user", "content": user_message}],
    )
    return message.content[0].text


async def call_grok(session_id: str, user_message: str, extra_context: str = "") -> str:
    history = get_session_messages(session_id)
    messages = [{"role": "system", "content": ALBERTA_SYSTEM_PROMPT + extra_context}]
    for msg in history[-20:]:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": user_message})

    try:
        response = await xai_client.chat.completions.create(
            model="grok-3", messages=messages, max_tokens=4096, temperature=0.7
        )
        return response.choices[0].message.content
    except Exception as e:
        if "model" in str(e).lower() or "not found" in str(e).lower():
            try:
                response = await xai_client.chat.completions.create(
                    model="grok-beta", messages=messages, max_tokens=4096, temperature=0.7
                )
                return response.choices[0].message.content
            except Exception as e2:
                raise HTTPException(status_code=500, detail=f"Grok API error: {str(e2)}")
        raise HTTPException(status_code=500, detail=f"Grok API error: {str(e)}")
