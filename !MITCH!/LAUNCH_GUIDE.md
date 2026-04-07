# SCSS AB Advocate — Full Launch Guide
### Verbose Step-by-Step | All Issues | Full Troubleshooter
*Last updated: 2026-04-06*

---

## BEFORE YOU START — READ THIS

This app runs on **your Windows machine**. Nothing is installed on client devices.
Clients access it through a browser on your local network (LAN).

You need:
- [ ] This machine running and connected to your network
- [ ] MongoDB Atlas account with correct password
- [ ] Anthropic API key with credits
- [ ] Python 3.10+ installed
- [ ] Node.js 18+ installed

---

## STEP 1 — Open a Terminal

1. Press `Windows Key + R`
2. Type `powershell` and press Enter
3. A blue terminal window opens

**What you should see:** A prompt ending in `>`

**If it says "Access Denied":** Right-click the Start menu → "Windows PowerShell" → Run as Administrator

---

## STEP 2 — Navigate to the Project

Type this exactly and press Enter:
```powershell
cd C:\Users\User\.1myprojects\ENV\emergent-SCSS
```

**What you should see:** The prompt changes to show the project folder path

**If it says "cannot find path":**
- Check that the folder exists in File Explorer
- Make sure you typed it exactly — backslashes `\` not forward slashes `/`

---

## STEP 3 — Run the Launcher

Type this and press Enter:
```powershell
powershell -ExecutionPolicy Bypass -File start-windows.ps1
```

**What you should see (in order):**

```
+------------------------------------------+
|     SCSS AB ADVOCATE -- WINDOWS RUNNER    |
+------------------------------------------+

==> Checking prerequisites
  [OK]  Python 3.13.x
  [OK]  Node v20.x.x

==> Checking environment
  [OK]  backend/.env found
  [OK]  frontend/.env found

==> Installing backend dependencies
  [OK]  Backend dependencies ready

==> Clearing ports 8001 and 3000
  [OK]  Ports cleared

==> Starting FastAPI backend on port 8001
  [OK]  Backend started (PID xxxxx)
  [OK]  Health check passed: ok

==> Starting React frontend on port 3000
  [OK]  Frontend started (PID xxxxx)

+------------------------------------------+
|  LOCAL  UI  ->  http://localhost:3000     |
|  LAN    UI  ->  http://192.168.0.125:3000 |
|  API Docs   ->  http://localhost:8001/docs|
+------------------------------------------+
```

**The whole process takes about 30–60 seconds on first run.**

---

## STEP 4 — Open the App

Open any web browser and go to:

- **On this machine:** `http://localhost:3000`
- **On any other device on your network:** `http://192.168.0.125:3000`

**What you should see:** The SCSS AB Advocate chat interface loads.

---

## STEP 5 — Verify Everything Works

Open this URL in your browser:
```
http://localhost:8001/api/debug
```

You should see a JSON response. Look for:
```json
"overall": "healthy"
```

If it says `"degraded"` — check the individual service statuses below it.
Grok showing `503` is normal (xAI outage) — Claude still works fine.

---

## STOPPING THE APP

In the PowerShell window, press **Ctrl+C** — OR — open a new PowerShell and run:
```powershell
Get-Process python,node -ErrorAction SilentlyContinue | Stop-Process -Force
```

---
---

# TROUBLESHOOTER — ALL KNOWN ISSUES

---

## ERROR: "Python not found"

**Cause:** Python isn't installed or isn't on PATH

**Fix:**
1. Go to `https://www.python.org/downloads/`
2. Download Python 3.11 or 3.13
3. During install — CHECK THE BOX: "Add Python to PATH"
4. Restart PowerShell after installing
5. Verify: type `python --version` — should show version number

---

## ERROR: "Node not found" / "npm not found"

**Cause:** Node.js isn't installed

**Fix:**
1. Go to `https://nodejs.org`
2. Download the LTS version (green button)
3. Install it — default options are fine
4. Restart PowerShell
5. Verify: type `node --version` — should show v18 or higher

---

## ERROR: "backend/.env not found"

**Cause:** The secrets file is missing

**Fix:** Create the file manually:
1. Open Notepad
2. Paste this (fill in your values):
```
MONGO_URL=mongodb+srv://mazzkilla:F754848619@cluster0.uvfzo0b.mongodb.net/?appName=Cluster0
DB_NAME=scss_advocate
ANTHROPIC_API_KEY=sk-ant-...your key here...
XAI_API_KEY=xai-...your key here...
```
3. Save as: `C:\Users\User\.1myprojects\ENV\emergent-SCSS\backend\.env`
4. Make sure it saves as `.env` not `.env.txt` — in Notepad, choose "All Files" in the file type dropdown

---

## ERROR: MongoDB connection refused / timeout

**Cause A:** Wrong password in MONGO_URL
- Fix: Make sure `backend/.env` has `F754848619` as the password

**Cause B:** Your IP isn't whitelisted in MongoDB Atlas
- Fix:
  1. Go to `https://cloud.mongodb.com`
  2. Sign in → Cluster0 → Network Access
  3. Add IP Address → Allow Access from Anywhere (`0.0.0.0/0`)
  4. Click Confirm — takes ~30 seconds to apply

**Cause C:** Atlas cluster is paused (M0 free tier auto-pauses)
- Fix:
  1. Go to `https://cloud.mongodb.com`
  2. Click on Cluster0
  3. If it says "Paused" — click Resume
  4. Wait 2–3 minutes for it to wake up

**Cause D:** No internet connection
- Fix: Check your network. The database is in the cloud — internet required.

---

## ERROR: Port already in use / "address already in use"

**Cause:** A previous instance of the app is still running

**Fix:**
```powershell
Get-Process python,node -ErrorAction SilentlyContinue | Stop-Process -Force
```
Wait 5 seconds, then try launching again.

---

## ERROR: Frontend won't load / blank white page

**Cause A:** Frontend is still compiling (takes 30–60 seconds first time)
- Fix: Wait and refresh the page

**Cause B:** Frontend can't reach the backend
- Fix: Check that `frontend/.env` contains:
  ```
  REACT_APP_BACKEND_URL=http://192.168.0.125:8001
  ```
  If you're only using it on this machine, change it to:
  ```
  REACT_APP_BACKEND_URL=http://localhost:8001
  ```
  Then restart the frontend.

**Cause C:** Backend isn't running
- Fix: Check that the backend started — visit `http://localhost:8001/api/health`
  If that fails, restart using the launcher.

---

## ERROR: "execution of scripts is disabled on this system"

**Cause:** PowerShell execution policy is blocking the script

**Fix:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Then run the launcher again.

---

## ERROR: Claude AI not responding / "missing_key"

**Cause:** ANTHROPIC_API_KEY is missing or wrong in backend/.env

**Fix:**
1. Go to `https://console.anthropic.com`
2. API Keys → copy your key
3. Open `backend/.env` and update the `ANTHROPIC_API_KEY=` line
4. Restart the backend

**Also check:** Your Anthropic account has credits. New accounts get free credits — check at console.anthropic.com

---

## ERROR: Grok shows "503" or "no_credits"

**Cause A (503):** xAI service is having an outage — not your fault
- Fix: Nothing to do. Claude still works. Check `https://status.x.ai` later.

**Cause B (no_credits):** xAI account needs credits
- Fix: Go to `https://console.x.ai` → add credits
- Note: Claude works independently — Grok is optional

---

## ERROR: "npm install" hangs or fails

**Cause:** Node modules corrupted or network issue

**Fix:**
```powershell
cd C:\Users\User\.1myprojects\ENV\emergent-SCSS\frontend
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install --legacy-peer-deps
```

---

## ERROR: LAN devices can't reach the app

**Cause A:** Windows Firewall blocking ports 3000/8001

**Fix (run as Administrator):**
```powershell
New-NetFirewallRule -DisplayName "SCSS Backend 8001" -Direction Inbound -Protocol TCP -LocalPort 8001 -Action Allow
New-NetFirewallRule -DisplayName "SCSS Frontend 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

**Cause B:** Wrong LAN IP in frontend/.env
- Fix: Run `ipconfig` → find your "IPv4 Address" under your active network adapter
  Update `frontend/.env` with that IP, then restart frontend.

**Cause C:** Devices on different network segments
- Fix: Make sure all devices are on the same WiFi/LAN network

---

## ERROR: App was working, now suddenly broken after restart

**Most common causes (in order):**
1. MongoDB Atlas paused → go resume it at cloud.mongodb.com
2. Services aren't running → run the launcher again
3. Your LAN IP changed → run `ipconfig`, update `frontend/.env`
4. Windows update changed something → restart and try launcher again

---

## CHECKING SYSTEM HEALTH (ALWAYS START HERE)

Visit: `http://localhost:8001/api/debug`

Read the output:
```
"overall": "healthy"    ← everything working
"overall": "degraded"   ← something is wrong, read the checks below it
```

Individual checks:
```
"mongodb": "ok"         ← database connected
"claude": "ok"          ← AI working
"grok": "503"           ← xAI outage (acceptable, Claude still works)
"web_search": "ok"      ← DuckDuckGo working
```

---

*SCSS AB Advocate — Troubleshooter v1.0 — 2026-04-06*
