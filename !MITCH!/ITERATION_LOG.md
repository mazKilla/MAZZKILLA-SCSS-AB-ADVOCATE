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
| 1 | Run policy crawler | `policy_docs` collection is empty — AI has no crawled Alberta.ca docs yet |
| 2 | Test full chat flow end-to-end | Confirm Claude responds correctly to ETW appeal questions |
| 3 | Add basic authentication | Anyone on LAN can access — at minimum a password or token |
| 4 | Fix EmailConverter.js ESLint warning | Line 771 — `// comment` inside JSX → `{/* comment */}` |
| 5 | Choose yarn OR npm | Both lockfiles present — pick one and remove the other |

### P2 — Should Do

| # | Task | Why |
|---|------|-----|
| 6 | Add xAI credits | Grok-3 is a strong complement to Claude for real-time answers |
| 7 | Paginate sessions list | Will break when DB grows past ~500 sessions |
| 8 | Add session search/filter | Hard to find old client sessions |
| 9 | Export session to PDF | Caseworkers need printable records |
| 10 | Add case reference field | Tag sessions with client initials/case code |

### P3 — Future / Nice to Have

| # | Task | Why |
|---|------|-----|
| 11 | User accounts / login | Multiple advocates, each with their own sessions |
| 12 | AISH policy deep-dive | System prompt could be expanded significantly |
| 13 | CAP hearing prep mode | Structured workflow for preparing oral hearings |
| 14 | Deadline calculator | Auto-calculate appeal deadlines from decision dates |
| 15 | Email template library | Pre-drafted letters for common situations |
| 16 | Docker deployment | Easier setup for orgs without tech staff |
| 17 | Mobile-responsive UI | For client self-service on phones |
| 18 | Alberta.ca auto-sync | Re-crawl policy docs on schedule |
| 19 | Multi-language support | Cree, French, Dene for Indigenous clients |
| 20 | Offline mode | For low-connectivity community use |

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
