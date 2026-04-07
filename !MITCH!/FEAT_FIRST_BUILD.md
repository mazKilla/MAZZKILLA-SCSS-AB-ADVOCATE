# FEAT: First Working Build
### Commit `2f3fc61` — 2026-04-06

---

## What This Commit Represents

This is the **first confirmed working build** of the SCSS AB Advocate stack.
Prior to this commit, the app had never successfully run end-to-end — the root cause
was a broken MongoDB Atlas password. Once fixed, the entire stack came online.

---

## What Was Broken Before

| Issue | Root Cause | Fix Applied |
|-------|-----------|-------------|
| MongoDB refused connection | Wrong Atlas password | Updated URI with `F754848619` |
| `misc.py` import errors | Stale `EMERGENT_LLM_KEY` reference from old SDK | Rewired to `ANTHROPIC_API_KEY` |
| Frontend couldn't reach backend on LAN | `REACT_APP_BACKEND_URL=http://localhost:8001` | Changed to `http://192.168.0.125:8001` |
| WSL runner attempted on incompatible hardware | Intel HD 620 — no nested virtualization | Created `start-windows.ps1` instead |
| `__pycache__` polluting git | Never in `.gitignore` | Added rule + removed from tracking |
| `.gitignore` had 5x duplicate env rules + junk `-e` entries | Warp auto-commits appended blindly | Fully rewritten clean |

---

## Files Changed

### Modified
| File | What Changed |
|------|-------------|
| `backend/config.py` | Removed `emergentintegrations` imports; direct `anthropic` SDK only |
| `backend/requirements.txt` | Added `anthropic>=0.40.0`, `python-multipart>=0.0.9` |
| `backend/routes/misc.py` | Fixed import — `EMERGENT_LLM_KEY` → `ANTHROPIC_API_KEY` |
| `backend/server.py` | Minor path/import cleanup |
| `.gitignore` | Full rewrite — clean, no duplicates, added `__pycache__/`, `.claude/`, `venv/` |

### Added
| File | Purpose |
|------|---------|
| `start-windows.ps1` | One-click Windows launcher — starts backend + frontend, checks prereqs, adds LAN info |
| `start-wsl.sh` | WSL launcher (Warp-generated; saved for future hardware) |
| `artifacts/RUNBOOK.md` | Full operator reference — URLs, commands, glossary, file map |
| `artifacts/FEAT_FIRST_BUILD.md` | This document |

### Deleted from Git
- All `backend/__pycache__/*.pyc` files (11 files) — never should have been tracked

---

## System Status at Commit Time

```
OVERALL: DEGRADED (Grok 503 — xAI outage, not account issue)

[OK]  MongoDB Atlas    — cluster0.uvfzo0b.mongodb.net
        chat_sessions:        6 documents
        chat_messages:        25 documents
        email_references:     3 documents
        ec_conversion_jobs:   20 documents
        ec_converted_emails:  20 documents
        ec_email_attachments: 0 documents
        policy_docs:          0 documents

[OK]  Claude AI        — claude-sonnet-4-5-20250929
[OK]  Web Search       — DuckDuckGo operational
[--]  Grok xAI         — 503 service unavailable (xAI-side outage)
```

---

## All 7 API Routes Verified

| Router | Mount | Key Endpoints |
|--------|-------|---------------|
| `misc.py` | `/api` | `GET /health`, `GET /debug`, `GET /models`, `POST /web-search` |
| `sessions.py` | `/api` | `POST /sessions`, `GET /sessions`, `DELETE /sessions/{id}` |
| `chat.py` | `/api` | `POST /chat` |
| `emails.py` | `/api` | `POST /emails/upload`, `GET /emails`, `DELETE /emails/{id}` |
| `ec.py` | `/api` | Email converter jobs |
| `policy.py` | `/api` | `POST /policy/crawl`, `GET /policy/docs` |
| `tools.py` | `/api` | Tool call endpoints |

Full interactive docs: `http://localhost:8001/docs`

---

## How to Start (Windows)

```powershell
# Option A — one-click launcher
powershell -ExecutionPolicy Bypass -File start-windows.ps1

# Option B — manual (two terminals)
# Terminal 1:
cd backend
python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2:
cd frontend
npm start
```

## How to Stop

```powershell
Get-Process python,node -ErrorAction SilentlyContinue | Stop-Process -Force
```

---

## Access URLs

| | Local | LAN |
|-|-------|-----|
| UI | http://localhost:3000 | http://192.168.0.125:3000 |
| API | http://localhost:8001 | http://192.168.0.125:8001 |
| Swagger | http://localhost:8001/docs | — |
| Health | http://localhost:8001/api/health | — |
| Debug | http://localhost:8001/api/debug | — |

---

## Architecture Snapshot

```
SCSS AB Advocate
│
├── Frontend (React :3000)
│   └── calls → Backend API at 192.168.0.125:8001
│
├── Backend (FastAPI + Uvicorn :8001)
│   ├── config.py          — shared DB, AI clients, Alberta system prompt
│   └── routes/
│       ├── chat.py        — AI chat (Claude / Grok)
│       ├── sessions.py    — conversation sessions
│       ├── emails.py      — email reference upload & retrieval
│       ├── ec.py          — email format converter
│       ├── policy.py      — Alberta.ca policy doc crawler
│       ├── tools.py       — web search tools
│       └── misc.py        — health, debug, model listing
│
├── MongoDB Atlas (cloud, M0 free)
│   └── DB: scss_advocate
│       ├── chat_sessions
│       ├── chat_messages
│       ├── email_references
│       ├── ec_conversion_jobs
│       ├── ec_converted_emails
│       ├── ec_email_attachments
│       └── policy_docs
│
└── AI Backends
    ├── Anthropic Claude Sonnet 4.5  ← primary
    └── xAI Grok-3                   ← secondary (needs xAI credits)
```

---

## Environment Variables Required

```
# backend/.env  (NOT in git — secrets)
MONGO_URL=mongodb+srv://mazzkilla:<pass>@cluster0.uvfzo0b.mongodb.net/?appName=Cluster0
DB_NAME=scss_advocate
ANTHROPIC_API_KEY=sk-ant-...
XAI_API_KEY=xai-...

# frontend/.env  (NOT in git — LAN-specific)
REACT_APP_BACKEND_URL=http://192.168.0.125:8001
```

---

## Known Issues / Next Steps

| # | Issue | Priority | Notes |
|---|-------|----------|-------|
| 1 | Grok 503 on startup | Low | xAI service outage — not account issue. Will recover |
| 2 | `frontend/yarn.lock` vs `package-lock.json` | Low | Two lockfiles present — pick one (npm or yarn) and remove the other |
| 3 | `EmailConverter.js:771` ESLint warning | Low | JSX comment syntax — `// comment` inside JSX should be `{/* comment */}` |
| 4 | `policy_docs` collection empty | Medium | Policy crawler hasn't been run yet |
| 5 | WSL not supported | Info | Intel HD 620 hardware limitation — no nested virtualization |
| 6 | `start-windows.ps1` opens minimized windows | Low | Backend/frontend logs hidden — open manually if debugging |

---

## Session History (Warp → Claude Code handoff)

This build was worked on across multiple AI sessions:

| Date | Agent | Key Work |
|------|-------|---------|
| 2026-03-22 to Mar-26 | Warp AI | Initial scaffold, dependency installs, Claude CLI setup |
| 2026-04-03 | Warp AI | `.gitattributes`, `start-wsl.sh` creation, handoff to Claude Code |
| 2026-04-06 | Claude Code (Sonnet 4.6) | MongoDB fix, LAN config, `start-windows.ps1`, first successful run, this commit |

---

*Artifact generated by Claude Sonnet 4.6 — 2026-04-06*
