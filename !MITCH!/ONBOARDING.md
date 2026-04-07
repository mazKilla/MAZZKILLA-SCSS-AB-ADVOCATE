# SCSS AB Advocate — Onboarding Guide
### For New Staff, Volunteers, and Contributors
*Last updated: 2026-04-06*

---

## Welcome. Here's What This Project Is.

You're looking at an AI-powered legal advocacy assistant built specifically for Alberta social benefit clients.

**The problem it solves:** Alberta's social benefit system (ETW, AISH, Income Support, SCSS) is complex, under-resourced, and often hostile to the people it's supposed to help. Advocates spend enormous time researching policy, drafting appeal language, and explaining rights — time that could be spent with clients. This tool handles the research and drafting, so advocates can focus on people.

**Who built it:** Mitchell Nadeau (mazKilla), with AI assistance from Warp Agent and Claude Code (Anthropic).

**What it is technically:** A Python/FastAPI backend + React frontend, connected to MongoDB Atlas for storage, using Anthropic's Claude AI as the primary engine.

---

## The Stack at a Glance

```
You (browser) → React frontend (port 3000)
                    ↓
             FastAPI backend (port 8001)
                    ↓
        ┌───────────┴────────────┐
   MongoDB Atlas          Anthropic Claude
   (your data)            (AI reasoning)
```

---

## Repository Structure — What Lives Where

```
MAZZKILLA-SCSS-AB-ADVOCATE/
│
├── !MITCH!/                    ← ALL project artifacts/docs (start here)
│   ├── LAUNCH_GUIDE.md         ← How to run + full troubleshooter
│   ├── ONBOARDING.md           ← This file
│   ├── RUNBOOK.md              ← Quick command reference
│   ├── FEAT_FIRST_BUILD.md     ← What was built and why
│   ├── FOR_NONPROFITS.md       ← Pitch doc for orgs like ECLC
│   ├── ITERATION_LOG.md        ← What's been done / what's next
│   └── client-facing/          ← Plain-language docs for clients
│
├── backend/
│   ├── server.py               ← FastAPI app entry — start reading here
│   ├── config.py               ← ALL shared state: DB, AI clients, system prompt
│   ├── requirements.txt        ← Python dependencies
│   ├── .env                    ← YOUR SECRETS — never commit this
│   └── routes/
│       ├── chat.py             ← The main AI chat endpoint
│       ├── sessions.py         ← Conversation session management
│       ├── emails.py           ← Client email upload + retrieval
│       ├── ec.py               ← Email format converter
│       ├── policy.py           ← Alberta.ca policy crawler
│       ├── tools.py            ← Web search tools
│       └── misc.py             ← Health, debug, model listing
│
├── frontend/
│   ├── src/App.js              ← React app root
│   ├── src/components/         ← All UI components
│   └── .env                    ← REACT_APP_BACKEND_URL (LAN IP)
│
├── start-windows.ps1           ← ONE-CLICK launcher for Windows
├── start-wsl.sh                ← WSL launcher (future — hardware limited)
└── .gitignore                  ← Secrets and pycache excluded
```

---

## Key File to Read First: `backend/config.py`

This file is the heart of the backend. It contains:
- Database connection setup
- Anthropic and xAI client initialization
- All utility functions (serialize, utcnow, web_search)
- The **Alberta System Prompt** — the AI's core identity and knowledge base
- `call_claude()` and `call_grok()` — the AI invocation functions

**If you want to change how the AI behaves — edit the system prompt in config.py.**

---

## Environment Variables You Need

Create `backend/.env` with:
```
MONGO_URL=mongodb+srv://mazzkilla:<password>@cluster0.uvfzo0b.mongodb.net/?appName=Cluster0
DB_NAME=scss_advocate
ANTHROPIC_API_KEY=sk-ant-...
XAI_API_KEY=xai-...
```

Create `frontend/.env` with:
```
REACT_APP_BACKEND_URL=http://<your-lan-ip>:8001
```

**These files are in `.gitignore` — never commit them.**
API keys are stored at: `C:/Users/User/Documents/API/!!!!!!!!!!!_KEYS/`

---

## How to Run (Short Version)

```powershell
# From project root:
powershell -ExecutionPolicy Bypass -File start-windows.ps1
```

Then open `http://localhost:3000`

Full details in `!MITCH!/LAUNCH_GUIDE.md`

---

## How to Verify It's Working

```
http://localhost:8001/api/health   ← should return {"status":"ok"}
http://localhost:8001/api/debug    ← full system status check
http://localhost:8001/docs         ← Swagger UI — test any endpoint
```

---

## The AI's Role and Limitations

The AI (Claude Sonnet 4.5) is configured as an Alberta benefit appeal expert.
It has deep knowledge of ETW, AISH, SCSS, Income Support, IESA legislation, and CAP procedures.

**It is NOT:**
- A licensed lawyer
- Connected to government systems
- Able to file documents
- Infallible — always have a human review its output

**It IS:**
- Extremely well-informed about Alberta policy
- Capable of drafting appeal language grounded in specific legislation
- A force multiplier for advocates who know what to do but need help with research and writing

---

## MongoDB — What's Stored

Database: `scss_advocate`

| Collection | What it stores |
|-----------|---------------|
| `chat_sessions` | Each conversation session |
| `chat_messages` | Individual messages within sessions |
| `email_references` | Client emails uploaded for analysis |
| `ec_conversion_jobs` | Email conversion job records |
| `ec_converted_emails` | Converted email outputs |
| `ec_email_attachments` | File attachments |
| `policy_docs` | Crawled Alberta.ca policy documents |

**Privacy note:** Do not enter full client names, SIN numbers, or file numbers into the chat. Use initials or case codes.

---

## Development Workflow

```powershell
# Check status
git status
git log --oneline -10

# Make a change, stage, commit
git add backend/routes/chat.py
git commit -m "feat: describe what you changed"

# Push to GitHub
git push origin main
```

**GitHub repo:** `https://github.com/mazKilla/MAZZKILLA-SCSS-AB-ADVOCATE`

---

## Who to Contact

Project lead: Mitchell Nadeau (mazKilla)
GitHub: `https://github.com/mazKilla`

---

## Known Limitations as of First Build (2026-04-06)

| Item | Status |
|------|--------|
| WSL support | Not available (Intel HD 620 hardware limit) |
| Grok xAI | Intermittent 503 outages — Claude covers it |
| policy_docs collection | Empty — crawler not yet run |
| EmailConverter.js ESLint warning | Line 771, JSX comment syntax — cosmetic only |
| yarn.lock + package-lock.json both present | Minor — pick one package manager |
| Sessions not paginated | Will matter when DB grows |
| No authentication | Anyone on LAN can access — add auth before public deployment |

---

*Welcome to the project. Ask questions. Make it better.*
*SCSS AB Advocate — 2026-04-06*
