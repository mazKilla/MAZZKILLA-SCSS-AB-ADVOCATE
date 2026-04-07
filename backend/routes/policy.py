"""
Alberta.ca Policy Document Crawler — /api/policy/*
On-demand: user provides a URL → extract text → save as policy reference.
"""
import io
import re
import requests as _requests
from datetime import timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId

from config import policy_docs_col, serialize_doc, utcnow

router = APIRouter()

CRAWL_TIMEOUT = 20  # seconds
MAX_CONTENT_LEN = 50_000  # chars stored per doc


def _fetch_and_extract(url: str) -> tuple[str, str]:
    """
    Fetch URL and return (title, extracted_text).
    Handles PDF and HTML.
    """
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (compatible; SCSSAdvocateBot/1.0; +https://alberta.ca)"
        )
    }
    resp = _requests.get(url, timeout=CRAWL_TIMEOUT, headers=headers, allow_redirects=True)
    resp.raise_for_status()

    content_type = resp.headers.get("Content-Type", "").lower()

    # ── PDF ──────────────────────────────────────────────────────────
    if "pdf" in content_type or url.lower().endswith(".pdf"):
        import pdfplumber
        pages = []
        with pdfplumber.open(io.BytesIO(resp.content)) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    pages.append(t)
        text = "\n\n".join(pages).strip() or "<EMPTY PDF>"
        # Use filename or URL fragment as title
        fname = url.rstrip("/").split("/")[-1]
        fname = re.sub(r"[_-]", " ", re.sub(r"\.[^.]+$", "", fname)).title()
        return fname or "Policy PDF", text[:MAX_CONTENT_LEN]

    # ── HTML ─────────────────────────────────────────────────────────
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(resp.text, "html.parser")
    for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
        tag.decompose()

    # Extract <title>
    title_tag = soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else ""

    # Try <main> or <article> for focused content
    main = soup.find("main") or soup.find("article") or soup.find("div", {"id": "main"}) or soup
    text = main.get_text(separator="\n", strip=True)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()

    return title or url, text[:MAX_CONTENT_LEN]


class CrawlRequest(BaseModel):
    url: str
    notes: Optional[str] = None


@router.post("/api/policy/crawl")
async def crawl_policy_url(body: CrawlRequest):
    url = body.url.strip()
    if not url.startswith("http"):
        raise HTTPException(status_code=400, detail="URL must start with http:// or https://")

    # Check duplicate
    existing = policy_docs_col.find_one({"url": url})
    if existing:
        return {"already_exists": True, "doc": serialize_doc(existing)}

    try:
        title, content = _fetch_and_extract(url)
    except _requests.exceptions.Timeout:
        raise HTTPException(status_code=408, detail="Request timed out fetching URL")
    except _requests.exceptions.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Remote server error: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Crawl failed: {str(e)}")

    doc = {
        "url": url,
        "title": title,
        "content": content,
        "word_count": len(content.split()),
        "notes": body.notes or "",
        "crawled_at": utcnow(),
    }
    result = policy_docs_col.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.get("/api/policy/docs")
async def list_policy_docs():
    docs = list(policy_docs_col.find({}, {"content": 0}, sort=[("crawled_at", -1)]).limit(50))
    return {"docs": serialize_doc(docs)}


@router.get("/api/policy/docs/{doc_id}")
async def get_policy_doc(doc_id: str):
    try:
        oid = ObjectId(doc_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    doc = policy_docs_col.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Policy doc not found")
    return serialize_doc(doc)


@router.delete("/api/policy/docs/{doc_id}")
async def delete_policy_doc(doc_id: str):
    try:
        oid = ObjectId(doc_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")
    policy_docs_col.delete_one({"_id": oid})
    return {"success": True}


@router.delete("/api/policy/docs")
async def wipe_policy_docs():
    result = policy_docs_col.delete_many({})
    return {"success": True, "deleted": result.deleted_count}
