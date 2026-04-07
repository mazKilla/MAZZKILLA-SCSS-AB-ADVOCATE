# SCSS AB ADVOCATE — PRD

## App Overview
AI-powered Alberta social benefits adjudicator and appeal guidance platform. The AI acts as "#1 Social Benefit and Justice Adjudicator" — Appeal Officer for the Appeals Secretariat, Ministry of Assisted Living and Social Services (ALSS), Government of Alberta.

## Architecture
- **Frontend**: React (Create React App) + Tailwind CSS — Port 3000
- **Backend**: FastAPI (Python) + MongoDB — Port 8001
- **AI Models**: Claude Sonnet 4.6 (Anthropic via Emergent LLM Key) + Grok 3 (xAI API)
- **Database**: MongoDB (sessions, messages, email references)
- **Web Search**: DuckDuckGo Search (auto-triggered on policy queries)
- **GitHub Ref**: https://github.com/mazzkilla1/Email-Transformer (PostgreSQL email schema reference)

## Security Gate
- On app load: user sees SYSTEM_LOCK screen
- QUERY: PUG_BUD → correct answer: BENJI
- Stores unlock in sessionStorage (persists per browser tab session)

## Core Requirements (Static)
1. AI orchestrator agent fully briefed on Alberta ETW, ALSS, SCSS policies
2. User-selectable AI model: Claude Sonnet 4.6 OR Grok 3
3. Long context memory (last 20 messages passed as context)
4. Automatic web search for Alberta policy queries (DuckDuckGo)
5. Email Converter: parse .eml/.mbox/.pdf/.txt/.html/.htm/.msg → structured JSON
6. Case/Session management (create, list, delete, per-session history)
7. High contrast shimmering dark theme — MazZKiLL@ logo in electric cyan
8. Alberta system prompt: ETW program, ALSS, appeal process, advocacy strategy

## What's Been Implemented

### Security Gate (2026-04)
- SecurityGate component in App.js
- Fullscreen lock screen with PUG_BUD query, BENJI passphrase
- Shake animation on wrong answer, sessionStorage persistence

### Backend (`/app/backend/server.py`)
- FastAPI with CORS, MongoDB connection
- Alberta system prompt with comprehensive ETW/ALSS/SCSS policy knowledge
- `POST /api/chat` — AI chat with auto web search + email context
- `GET/POST /api/sessions`, `DELETE /api/sessions/{id}` — Session management
- `GET /api/sessions/{id}/messages` — Message history
- `GET/POST /api/emails`, `GET/DELETE /api/emails/{id}` — Email references (MongoDB)
- `POST /api/web-search` — DuckDuckGo web search
- `GET /api/policy-resources` — Alberta policy resource links
- `GET /api/models` — Available AI models (Claude Sonnet 4.6, Grok 3)
- Claude integration: emergentintegrations (claude-sonnet-4-6)
- Grok3 integration: openai SDK with xAI base URL (grok-3 + grok-beta fallback)
- **Email Converter routes (2026-04):**
  - `POST /api/ec/upload` — Upload single file, background parse
  - `POST /api/ec/upload-batch` — Upload multiple files in one request (folder uploads)
  - `GET /api/ec/jobs` — List all conversion jobs
  - `GET /api/ec/jobs/{id}` — Job details + extracted emails
  - `DELETE /api/ec/jobs/{id}` — Delete job + all emails/attachments
  - `GET /api/ec/emails/{id}/download` — Download single email as .txt
  - `GET /api/ec/jobs/{id}/export` — Export all emails as .zip
  - `GET /api/ec/emails/{id}/attachments` — List attachments
  - `GET /api/ec/attachments/{id}/download` — Download individual attachment
- File type support: `.eml`, `.mbox`, `.pdf`, `.txt`, `.text`, `.html`, `.htm`, `.msg`
- PDF parser: pdfplumber (extracts text per page)
- TXT/HTML parser: raw text extraction
- Email parser: signature/quote stripping (`_strip_signatures_and_quotes`), structured JSON output
- Structured JSON stored per record: `{ subject, sender, recipients, date, clean_body, body_word_count, has_attachments, attachment_count, attachments[] }`

### Frontend (`/app/frontend/src/`)
- `App.js` — SecurityGate + main layout + tab state (chat | converter)
- `Header.js` — MazZKiLL@ logo, model selector, tab navigation, Debug button
- `Sidebar.js` — Session/case list, create/delete
- `ChatArea.js` — Chat messages, quick prompts, thinking animation
- `MessageBubble.js` — Markdown rendering, citations
- `EmailPanel.js` — Email CRUD, attach to chat
- `DebugPanel.js` — System health check
- **`EmailConverter.js` (2026-04 rewrite):**
  - Upload zone: drag & drop, SELECT_FILES (multi), SELECT_FOLDER (webkitdirectory recursive)
  - File type badges in upload zone
  - Per-file upload progress with status icons
  - Jobs table: JOB_ID, SOURCE_FILE (with type icon), STATUS, PROGRESS, TIMESTAMP, ACTIONS
  - Job detail: checkboxes per email row + SELECT_ALL toggle
  - Bulk "SEND X TO ADVOCATE" button with ConfirmModal (confirms count before dispatch)
  - Single-email "SEND" button still available per row
  - Body preview shows "signatures & quotes stripped" label
  - Export ZIP, individual TXT download still available

## Prioritized Backlog
### P0 (Critical — must have)
- [x] AI chat (Claude Sonnet 4.6 + Grok3)
- [x] Session management
- [x] Email references
- [x] Alberta policy system prompt
- [x] Email Converter multi-file type support
- [x] Security Gate (PUG_BUD / BENJI)
- [x] Multi-select + bulk send to advocate
- [x] Email parser signature/quote stripping + structured JSON

### P1 (High value)
- [ ] PostgreSQL email import from user's local DB (requires external access or import tool)
- [ ] Policy document PDF reader (crawl/parse Alberta.ca PDFs)
- [ ] Appeal letter template generator
- [ ] Export case to PDF
- [ ] server.py refactor: split into routers (email_converter.py, chat.py, sessions.py)

### P2 (Nice to have)
- [ ] Rate limiting on /api/chat
- [ ] Async MongoDB (motor driver) for better performance
- [ ] Authentication/multi-user support
- [ ] Case tagging and categorization
- [ ] Search across all sessions
- [ ] Grok credits — user needs to add xAI credits

## Environment Variables
- Backend: MONGO_URL, DB_NAME, EMERGENT_LLM_KEY, XAI_API_KEY
- Frontend: REACT_APP_BACKEND_URL

## Test Results (2026-04-02 iteration_6)
- Backend: 100% (8/8), Frontend: 100%
- Email body truncation fixed: [:8000] per ref (was [:1000])
- Send to Advocate: each email saved separately with structured body + attachments_summary
- EC detail view: BODY | JSON tab switcher showing structured_json with attachment array
