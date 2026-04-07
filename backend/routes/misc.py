"""Misc endpoints — health, debug, models, web-search, policy-resources"""
import sys
import platform
from fastapi import APIRouter, HTTPException
from config import (
    mongo_client, sessions_col, messages_col, emails_col,
    ec_jobs_col, ec_emails_col, ec_attachments_col, policy_docs_col,
    ANTHROPIC_API_KEY, XAI_API_KEY, MONGO_URL, DB_NAME,
    xai_client, web_search, utcnow,
)

router = APIRouter()


@router.get("/api/health")
async def health():
    return {"status": "ok", "service": "SCSS AB Advocate", "timestamp": utcnow().isoformat()}


@router.get("/api/debug")
async def debug_health():
    checks = {}

    try:
        mongo_client.admin.command("ping")
        checks["mongodb"] = {
            "status": "ok",
            "collections": {
                "chat_sessions":     sessions_col.count_documents({}),
                "chat_messages":     messages_col.count_documents({}),
                "email_references":  emails_col.count_documents({}),
                "ec_conversion_jobs": ec_jobs_col.count_documents({}),
                "ec_converted_emails": ec_emails_col.count_documents({}),
                "ec_email_attachments": ec_attachments_col.count_documents({}),
                "policy_docs":       policy_docs_col.count_documents({}),
            },
        }
    except Exception as e:
        checks["mongodb"] = {"status": "error", "error": str(e)}

    checks["claude"] = {
        "status": "ok" if ANTHROPIC_API_KEY else "missing_key",
        "key_prefix": ANTHROPIC_API_KEY[:12] + "..." if ANTHROPIC_API_KEY else None,
        "model": "claude-sonnet-4-5-20250929",
    }

    grok_status = {"key_prefix": XAI_API_KEY[:12] + "..." if XAI_API_KEY else None}
    if XAI_API_KEY:
        try:
            test_resp = await xai_client.chat.completions.create(
                model="grok-3",
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=5,
            )
            grok_status.update({"status": "ok", "model": "grok-3", "response_sample": test_resp.choices[0].message.content})
        except Exception as e:
            err_str = str(e)
            import re as _re
            if "credits" in err_str.lower() or "licenses" in err_str.lower():
                grok_status["status"] = "no_credits"
                grok_status["error"] = "xAI account has no credits. Add credits at: https://console.x.ai"
                match = _re.search(r'https://console\.x\.ai/team/[^\s"]+', err_str)
                if match:
                    grok_status["credits_url"] = match.group(0)
            else:
                try:
                    test_resp2 = await xai_client.chat.completions.create(
                        model="grok-beta", messages=[{"role": "user", "content": "ping"}], max_tokens=5
                    )
                    grok_status.update({"status": "ok_fallback", "model": "grok-beta", "note": err_str[:80]})
                except Exception as e2:
                    grok_status.update({"status": "error", "error": f"grok-3: {err_str[:120]} | grok-beta: {str(e2)[:120]}"})
    else:
        grok_status["status"] = "missing_key"
    checks["grok"] = grok_status

    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            r = list(ddgs.text("Alberta ETW appeal", max_results=1))
        checks["web_search"] = {"status": "ok", "test_result_count": len(r)}
    except Exception as e:
        checks["web_search"] = {"status": "error", "error": str(e)[:120]}

    checks["system"] = {
        "python": sys.version,
        "platform": platform.platform(),
        "db_name": DB_NAME,
        "env_loaded": all([MONGO_URL, ANTHROPIC_API_KEY]),
    }

    all_ok = all(
        v.get("status") in ("ok", "ok_fallback")
        for k, v in checks.items()
        if isinstance(v, dict) and k != "system"
    )
    return {"overall": "healthy" if all_ok else "degraded", "timestamp": utcnow().isoformat(), "checks": checks}


@router.get("/api/models")
async def get_models():
    return {
        "models": [
            {
                "id": "claude",
                "name": "Claude Sonnet 4.5",
                "provider": "Anthropic",
                "description": "Advanced reasoning & long context analysis",
                "available": bool(ANTHROPIC_API_KEY),
            },
            {
                "id": "grok",
                "name": "Grok 3",
                "provider": "xAI",
                "description": "Real-time knowledge & direct answers",
                "available": bool(XAI_API_KEY),
            },
        ]
    }


@router.post("/api/web-search")
async def do_web_search(body: dict):
    query = body.get("query", "")
    if not query:
        raise HTTPException(status_code=400, detail="Query required")
    results = web_search(f"Alberta {query}", max_results=6)
    return {"results": results, "query": query}


@router.get("/api/policy-resources")
async def get_policy_resources():
    return {
        "resources": [
            {"title": "Income Support Policy Manual", "url": "https://www.alberta.ca/income-support-policy-manual", "category": "Policy Manual", "description": "Official Alberta Works Income Support policy manual including ETW"},
            {"title": "Appeal an Income/Employment Supports Decision", "url": "https://www.alberta.ca/appeal-income-employment-supports-decision", "category": "Appeals", "description": "Official appeals process, forms and deadlines"},
            {"title": "Income/Employment Supports Appeal Hearing", "url": "https://www.alberta.ca/income-employment-supports-appeal-hearing", "category": "Appeals", "description": "What to expect at your Citizens Appeal Panel hearing"},
            {"title": "SCSS Annual Report 2024-2025", "url": "https://open.alberta.ca/dataset/3a6b50d8-c1f2-4e9a-94ec-62f1e0a34e59/resource/5b876aae-aaae-4c93-a9a1-4fe1305c7b39/download/scss-annual-report-2024-2025.pdf", "category": "Annual Report", "description": "Seniors and Community Support Services annual report"},
            {"title": "Seniors Financial Assistance Information Booklet 2025", "url": "https://open.alberta.ca/dataset/8df5377c-5db8-415c-b282-cf5623a8a9b7/resource/abfbab87-0eff-49d2-91c7-6e8b3d4464b1/download/alss-seniors-financial-assistance-information-booklet-2025-10.pdf", "category": "Seniors Benefits", "description": "ALSS seniors financial assistance information booklet"},
            {"title": "Alberta Works Your Guide to Income Support", "url": "https://open.alberta.ca/dataset/038f1b12-e9c5-4342-99bc-512a10388a0e/resource/96e9430a-6875-4ce6-b061-5fb6c24e45c6/download/zz-2011-alberta-works-your-guide-to-income-support.pdf", "category": "Program Guide", "description": "Comprehensive guide to Alberta Works Income Support programs"},
            {"title": "Supportive Living – How to Appeal", "url": "https://www.alberta.ca/supportive-living-accommodation-licensing-how-to-appeal", "category": "Appeals", "description": "Appeal process for supportive living accommodation decisions"},
            {"title": "Protection for Persons in Care – How to Appeal", "url": "https://www.alberta.ca/protection-for-persons-in-care-how-to-appeal", "category": "Appeals", "description": "Appeal process under Protection for Persons in Care Act"},
            {"title": "Alberta Ombudsman – Appeals Secretariat", "url": "https://www.ombudsman.ab.ca/complaint-checker/government-of-alberta/appeals-secretariat-citizens-appeal-panel/", "category": "Oversight", "description": "Ombudsman process for CAP decision review"},
            {"title": "Auditor General: Income Support for Albertans 2024", "url": "https://www.oag.ab.ca/wp-content/uploads/2024/03/2024-Income-Support-for-Albertans-AOI.pdf", "category": "Oversight", "description": "Auditor General review of income support program administration"},
        ]
    }
