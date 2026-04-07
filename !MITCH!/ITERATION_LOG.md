# SCSS AB Advocate — Iteration Log
### What Was Done | What's Next | Improvement Roadmap
*Last updated: 2026-04-06*

---

## COMPLETED — Build History

---

### PHASE 0 — Origin (Replit / Emergent LLM)
**When:** Before 2026-02-25
**Agent:** Emergent LLM (initial scaffold)

- Initial project structure created on Replit
- Emergent LLM scaffold: basic FastAPI backend, React frontend
- Used `emergentintegrations` SDK for AI calls
- MongoDB Atlas cluster created (M0 free tier)
- Alberta system prompt first drafted

---

### PHASE 1 — Environment Setup (Feb–Mar 2026)
**When:** 2026-02-25 to 2026-03-22
**Agent:** Warp AI

- Python environment setup attempts (multiple failures with litellm, pip issues)
- Installed pip, bash, qdrant, tavily dependencies
- Set CHUNK_SIZE and other env vars
- Attempted Docker and docker-compose installs (nested virtualization block discovered)
- Moved off Replit to local Windows machine
- Claude CLI installation via Bun

---

### PHASE 2 — Git & Credentials (Mar 2026)
**When:** 2026-03-24 to 2026-04-03
**Agent:** Warp AI

- Git user name/email configured
- Branch `100-credit--opus` pulled and merged
- `.gitattributes` file created
- `memory/test_credentials.md` managed (added/removed linguist-generated rule)
- `start-wsl.sh` WSL runner script created by Warp AI
- Determined WSL not viable (nested virtualization unsupported on Intel HD 620)
- Handoff to Claude Code initiated: user message "sure. get help from CLAUDE CODE"

---

### PHASE 4 — Docker + GitHub Packages (2026-04-07)
**When:** 2026-04-07
**Agent:** Claude Code (Sonnet 4.6)

**What was done:**
- Docker image built (single-stage python:3.13-slim, pre-built React static files)
- `Dockerfile`, `docker-entrypoint.sh`, `.dockerignore` added to repo
- Image published to GitHub Container Registry: `ghcr.io/mazkilla/mazzkilla-scss-ab-advocate:latest`
- Classic PAT with `write:packages` scope required (OAuth token insufficient)
- Line-wrapping in terminal corrupts Docker env var URLs — documented in RUNBOOK
- Full Docker CLI reference added to `!MITCH!/RUNBOOK.md`
- Container runs successfully via Docker Desktop

**Known issue logged:**
- LAN access broken when running via Docker — other devices cannot view UI
- Native `start-windows.ps1` still works for LAN (use this until Docker LAN fixed)

---

### PHASE 3 — First Working Build (2026-04-06)
**When:** 2026-04-06
**Agent:** Claude Code (Sonnet 4.6)

**What was fixed:**
- MongoDB Atlas password corrected (`F754848619`) — this was the root cause of all prior failures
- MongoDB Atlas IP whitelist set to `0.0.0.0/0`
- `misc.py` stale `EMERGENT_LLM_KEY` import fixed → `ANTHROPIC_API_KEY`
- `frontend/.env` updated from `localhost` to LAN IP `192.168.0.125:8001`
- `.gitignore` fully rewritten (removed 5x duplicate env rules, added `__pycache__/`, `.claude/`)
- `__pycache__` removed from git tracking
- Windows Firewall rules added for ports 8001 and 3000
- `start-windows.ps1` created — full Windows native launcher

**What was verified working:**
- MongoDB Atlas: connected, all collections accessible
- Claude AI: responding correctly
- Web search: DuckDuckGo operational
- All 7 API routes: chat, sessions, emails, ec, policy, tools, misc
- Frontend: compiled, serving on port 3000
- LAN access: confirmed via `192.168.0.125`

**Artifacts created:**
- `!MITCH!/RUNBOOK.md`
- `!MITCH!/FEAT_FIRST_BUILD.md`
- `!MITCH!/FOR_NONPROFITS.md`
- `!MITCH!/LAUNCH_GUIDE.md`
- `!MITCH!/ONBOARDING.md`
- `!MITCH!/ITERATION_LOG.md` (this file)
- `!MITCH!/client-facing/` (full client docs suite)

**GitHub:**
- New repo created: `https://github.com/mazKilla/MAZZKILLA-SCSS-AB-ADVOCATE`
- Clean history push (secrets scrubbed from old Warp commits)
- gh CLI v2.89.0 installed via winget

---

## IN PROGRESS

| Item | Status | Notes |
|------|--------|-------|
| GitHub repo live | Done | `mazKilla/MAZZKILLA-SCSS-AB-ADVOCATE` |
| Client-facing docs | Done | In `!MITCH!/client-facing/` |
| Verbose launch test | Pending | Need to run `start-windows.ps1` with live output |

---

## NEXT — Immediate Priorities

### P1 — Must Do Soon

| # | Task | Why |
|---|------|-----|
| 1 | **Fix LAN access in Docker** | Other LAN devices can't reach Docker container — Windows Firewall not passing Docker ports to network |
| 2 | **Add kill/stop process to launcher** | No way to cleanly stop backend+frontend from within the app or shortcut — must hunt PIDs manually |
| 3 | Run policy crawler | `policy_docs` collection is empty — AI has no crawled Alberta.ca docs yet |
| 4 | Test full chat flow end-to-end | Confirm Claude responds correctly to ETW appeal questions |
| 5 | Add basic authentication | Anyone on LAN can access — at minimum a password or token |
| 6 | Fix EmailConverter.js ESLint warning | Line 771 — `// comment` inside JSX → `{/* comment */}` |
| 7 | Choose yarn OR npm | Both lockfiles present — pick one and remove the other |

### P2 — UI / UX Improvements (from user feedback 2026-04-07)

| # | Task | Why |
|---|------|-----|
| 8 | **Multi-select file uploads with checkboxes** | Current UX: select 1 file → returns to main screen every time. Need checkbox list, select multiple, then one "Send All Marked" action |
| 9 | **Two upload checkbox pools** | One checkbox set for emails (EmailPanel), second for documents (populates document/context side for AI). Currently only 1 email-only selector |
| 10 | **Launcher splash/spinner screen** | Show app logo with spinning animation while backend+frontend are loading — users currently have no visual feedback on when to open the browser |
| 11 | **Web crawler — government domains** | List known Alberta gov domains in document upload UI. Crawled content goes to a SEPARATE `knowledge_base` MongoDB collection for AI context. Upgrade crawler to use best available Claude model (claude-opus-4-6) |
| 12 | Add xAI credits | Grok-3 is a strong complement to Claude for real-time answers |
| 13 | Paginate sessions list | Will break when DB grows past ~500 sessions |
| 14 | Add session search/filter | Hard to find old client sessions |
| 15 | Export session to PDF | Caseworkers need printable records |
| 16 | Add case reference field | Tag sessions with client initials/case code |

### P3 — Future / Nice to Have

| # | Task | Why |
|---|------|-----|
| 17 | User accounts / login | Multiple advocates, each with their own sessions |
| 18 | AISH policy deep-dive | System prompt could be expanded significantly |
| 19 | CAP hearing prep mode | Structured workflow for preparing oral hearings |
| 20 | Deadline calculator | Auto-calculate appeal deadlines from decision dates |
| 21 | Email template library | Pre-drafted letters for common situations |
| 22 | Mobile-responsive UI | For client self-service on phones |
| 23 | Alberta.ca auto-sync | Re-crawl policy docs on schedule |
| 24 | Multi-language support | Cree, French, Dene for Indigenous clients |
| 25 | Offline mode | For low-connectivity community use |

---

## KNOWN BUGS / ISSUES

| ID | Description | Severity | Status |
|----|-------------|----------|--------|
| BUG-01 | EmailConverter.js:771 JSX comment syntax warning | Low | Open |
| BUG-02 | WSL runner (start-wsl.sh) non-functional on this hardware | Info | Won't fix (hardware) |
| BUG-03 | Grok 503 on xAI service outages | Low | External — can't fix |
| BUG-04 | Ghost port (8001) after kill shows in netstat briefly | Low | Self-resolves |
| BUG-05 | yarn.lock + package-lock.json both in repo | Low | Open |
| BUG-06 | policy_docs collection never populated | Medium | Open — needs crawler run |
| BUG-07 | No input sanitization on chat endpoint | Medium | Open — internal network only for now |
| BUG-08 | CORS set to allow all origins (*) | Medium | Acceptable for LAN, fix before public deploy |
| BUG-09 | Docker container not LAN-accessible — only localhost works | High | Open — Windows Firewall/Docker network bridge issue |
| BUG-10 | No clean stop mechanism in launcher/shortcut | Medium | Open — must kill PIDs manually |

---

## ARCHITECTURE DECISIONS — LOG

| Decision | Chosen | Rejected | Reason |
|----------|--------|---------|--------|
| AI SDK | Direct Anthropic SDK | emergentintegrations | emergentintegrations was a wrapper that caused import issues after migration from Replit |
| Database | MongoDB Atlas M0 | Local MongoDB | Atlas works without local setup; M0 free tier sufficient for current scale |
| Frontend | React (react-scripts) | Vite/Next.js | Already scaffolded by Emergent LLM — not worth migrating |
| Deployment | Windows native | Docker, WSL | Nested virtualization not supported on host hardware |
| AI primary | Claude Sonnet 4.5 | Grok-3 | Grok unreliable credits/outages; Claude more stable |
| Repo | New clean repo | Keep emergent-SCSS | Old repo had secrets in commit history; fresh start cleaner |

---

*SCSS AB Advocate — Iteration Log — Updated 2026-04-06*
