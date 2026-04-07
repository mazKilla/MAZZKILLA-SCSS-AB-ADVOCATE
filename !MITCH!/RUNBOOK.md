# SCSS AB Advocate — Runbook & Quick Reference

---

## Stack Overview

| Layer     | Tech                        | Port  |
|-----------|-----------------------------|-------|
| Backend   | Python 3.13 + FastAPI + Uvicorn | 8001  |
| Frontend  | React (react-scripts)       | 3000  |
| Database  | MongoDB Atlas M0 (cloud)    | —     |
| AI        | Anthropic Claude Sonnet 4.5 | —     |
| AI (alt)  | xAI Grok-3                  | —     |

---

## Access URLs

| What          | URL                                      |
|---------------|------------------------------------------|
| UI (local)    | http://localhost:3000                    |
| UI (LAN)      | http://192.168.0.125:3000                |
| API (local)   | http://localhost:8001                    |
| API (LAN)     | http://192.168.0.125:8001                |
| Swagger docs  | http://localhost:8001/docs               |
| Health check  | http://localhost:8001/api/health         |
| Full debug    | http://localhost:8001/api/debug          |

---

## Start Services (Windows Native)

### Step 1 — Start Backend
```powershell
cd C:\Users\User\.1myprojects\ENV\emergent-SCSS\backend
python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Step 2 — Start Frontend (new terminal)
```powershell
cd C:\Users\User\.1myprojects\ENV\emergent-SCSS\frontend
npm start
```

> **Note:** `--host 0.0.0.0` on the backend makes it LAN-accessible.
> Frontend is already configured to point to `http://192.168.0.125:8001`.

---

## Stop Services

### Find what's on the ports
```powershell
netstat -ano | findstr ":8001 :3000"
```

### Kill by PID (replace XXXX with actual PID)
```powershell
taskkill /PID XXXX /F
```

### Nuclear option — kill all Python and Node
```powershell
Get-Process python,node -ErrorAction SilentlyContinue | Stop-Process -Force
```

---

## Environment Files

### backend/.env (already configured)
```
MONGO_URL=mongodb+srv://mazzkilla:<password>@cluster0.uvfzo0b.mongodb.net/?appName=Cluster0
DB_NAME=scss_advocate
ANTHROPIC_API_KEY=sk-ant-...
XAI_API_KEY=xai-...
```

### frontend/.env (LAN-configured)
```
REACT_APP_BACKEND_URL=http://192.168.0.125:8001
```

---

## MongoDB Atlas — Key Notes

- **Cluster:** Cluster0 @ `cluster0.uvfzo0b.mongodb.net`
- **User:** `mazzkilla`
- **DB Name:** `scss_advocate`
- **Tier:** M0 Free — auto-pauses after inactivity
- **IP Whitelist:** Must include your current IP
  - LAN machine: `192.168.0.125`
  - WSL: changes on every reboot (use `wsl hostname -I`)
  - Allow all: `0.0.0.0/0` (dev only)
- **Atlas Console:** https://cloud.mongodb.com

---

## Firewall — Open Ports for LAN Access

Run once in PowerShell as Administrator:
```powershell
New-NetFirewallRule -DisplayName "SCSS Backend 8001" -Direction Inbound -Protocol TCP -LocalPort 8001 -Action Allow
New-NetFirewallRule -DisplayName "SCSS Frontend 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

---

## Verify Everything Is Working

```powershell
# Backend health
curl http://localhost:8001/api/health

# Full system debug (MongoDB, Claude, Grok, web search)
curl http://localhost:8001/api/debug

# Test from LAN device browser
http://192.168.0.125:3000
```

---

## Key File Locations

```
emergent-SCSS/
├── backend/
│   ├── server.py          ← FastAPI app entry point
│   ├── config.py          ← DB, AI clients, system prompt
│   ├── requirements.txt   ← Python deps
│   ├── .env               ← secrets (not in git)
│   └── routes/
│       ├── chat.py        ← AI chat endpoints
│       ├── sessions.py    ← session management
│       ├── emails.py      ← email reference upload
│       ├── ec.py          ← email converter
│       ├── policy.py      ← policy doc crawler
│       ├── tools.py       ← web search tools
│       └── misc.py        ← health, debug, models
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   └── components/    ← UI components
│   └── .env               ← REACT_APP_BACKEND_URL
└── start-wsl.sh           ← WSL runner (future use)
```

---

## WSL Notes

- **WSL does NOT work on this machine** — nested virtualization not supported (Intel HD 620 limitation)
- `start-wsl.sh` exists for future use if hardware changes
- Get WSL IP (when it works): `wsl hostname -I`
- WSL IP changes every reboot — always check before updating Atlas whitelist

---

## Git — Useful Commands

```powershell
git log --oneline -10        # recent commits
git status                   # what's changed
git diff                     # see changes
git add -p                   # stage interactively
git commit -m "message"
git push origin main
```

---

## Glossary

| Term | Meaning |
|------|---------|
| **SCSS** | Seniors and Community Support Services (Alberta gov program) |
| **ETW** | Expected to Work — Alberta Works designation |
| **ETWB** | Expected to Work with Barriers |
| **BFE** | Barriers to Full Employment |
| **AISH** | Assured Income for the Severely Handicapped |
| **IESA** | Income and Employment Supports Act |
| **CAP** | Citizens Appeal Panel |
| **ALSS** | Ministry of Assisted Living and Social Services |
| **FOIP** | Freedom of Information and Protection of Privacy Act |
| **FastAPI** | Python web framework — generates `/docs` Swagger UI automatically |
| **Uvicorn** | ASGI server that runs the FastAPI app |
| **Atlas M0** | MongoDB free cloud tier — 512MB storage, auto-pauses |
| **CIDR** | IP range notation e.g. `0.0.0.0/0` = all IPs |
| **0.0.0.0** | Bind to all network interfaces (makes service LAN-accessible) |
| **localhost** | Only accessible on same machine (127.0.0.1) |
| **LAN IP** | Your machine's address on the local network: `192.168.0.125` |
| **Swagger** | Auto-generated API docs at `/docs` — lets you test endpoints in browser |

---

*Last updated: 2026-04-06 | Claude Sonnet 4.6*
