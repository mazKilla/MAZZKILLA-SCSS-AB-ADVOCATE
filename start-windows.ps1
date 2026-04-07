# ============================================================
#  SCSS AB Advocate — Windows Native Launcher
#  Run from project root: powershell -ExecutionPolicy Bypass -File start-windows.ps1
# ============================================================

$ProjectDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir  = Join-Path $ProjectDir "backend"
$FrontendDir = Join-Path $ProjectDir "frontend"
$BackendPort = 8001
$FrontendPort = 3000
$LanIP = "192.168.0.125"

function Write-Header($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK($msg)     { Write-Host "  [OK]  $msg" -ForegroundColor Green }
function Write-Warn($msg)   { Write-Host "  [!!]  $msg" -ForegroundColor Yellow }
function Write-Err($msg)    { Write-Host "  [XX]  $msg" -ForegroundColor Red }

Write-Host @"
  +------------------------------------------+
  |     SCSS AB ADVOCATE -- WINDOWS RUNNER    |
  +------------------------------------------+
"@ -ForegroundColor Cyan

# ── Check Python ──────────────────────────────────────────
Write-Header "Checking prerequisites"
$pyVersion = python --version 2>&1
if ($LASTEXITCODE -ne 0) { Write-Err "Python not found. Install Python 3.10+"; exit 1 }
Write-OK $pyVersion

$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -ne 0) { Write-Err "Node.js not found. Install Node 18+"; exit 1 }
Write-OK "Node $nodeVersion"

# ── Check .env ────────────────────────────────────────────
Write-Header "Checking environment"
$envFile = Join-Path $BackendDir ".env"
if (-not (Test-Path $envFile)) {
    Write-Err "backend/.env not found. Create it with MONGO_URL, ANTHROPIC_API_KEY etc."
    exit 1
}
Write-OK "backend/.env found"

$frontendEnv = Join-Path $FrontendDir ".env"
if (-not (Test-Path $frontendEnv)) {
    "REACT_APP_BACKEND_URL=http://${LanIP}:${BackendPort}" | Out-File $frontendEnv -Encoding utf8
    Write-OK "Created frontend/.env with LAN backend URL"
} else {
    Write-OK "frontend/.env found"
}

# ── Install backend deps ──────────────────────────────────
Write-Header "Installing backend dependencies"
$reqFile = Join-Path $BackendDir "requirements.txt"
python -m pip install -q -r $reqFile
if ($LASTEXITCODE -ne 0) { Write-Err "pip install failed"; exit 1 }
Write-OK "Backend dependencies ready"

# ── Kill anything on our ports ────────────────────────────
Write-Header "Clearing ports $BackendPort and $FrontendPort"
foreach ($port in @($BackendPort, $FrontendPort)) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $conns) {
        $owner = $conn.OwningProcess
        $proc = Get-Process -Id $owner -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Warn "Killing $($proc.ProcessName) (PID $owner) on port $port"
            Stop-Process -Id $owner -Force -ErrorAction SilentlyContinue
        }
    }
}
Start-Sleep -Seconds 1
Write-OK "Ports cleared"

# ── Start backend ─────────────────────────────────────────
Write-Header "Starting FastAPI backend on port $BackendPort"
$backendJob = Start-Process -FilePath "python" `
    -ArgumentList "-m uvicorn server:app --host 0.0.0.0 --port $BackendPort --reload --log-level warning" `
    -WorkingDirectory $BackendDir `
    -PassThru -WindowStyle Minimized
Write-OK "Backend started (PID $($backendJob.Id))"

# Wait and verify
Start-Sleep -Seconds 3
try {
    $health = Invoke-RestMethod -Uri "http://localhost:$BackendPort/api/health" -TimeoutSec 5
    Write-OK "Health check passed: $($health.status)"
} catch {
    Write-Err "Backend health check failed — check for errors in the backend window"
}

# ── Start frontend ────────────────────────────────────────
Write-Header "Starting React frontend on port $FrontendPort"
$frontendJob = Start-Process -FilePath "npm" `
    -ArgumentList "start" `
    -WorkingDirectory $FrontendDir `
    -PassThru -WindowStyle Minimized
Write-OK "Frontend started (PID $($frontendJob.Id))"

# ── Summary ───────────────────────────────────────────────
Write-Host "`n"
Write-Host "  +------------------------------------------+" -ForegroundColor Green
Write-Host "  |  LOCAL  UI  ->  http://localhost:$FrontendPort       |" -ForegroundColor Green
Write-Host "  |  LAN    UI  ->  http://${LanIP}:$FrontendPort  |" -ForegroundColor Green
Write-Host "  |  API Docs   ->  http://localhost:$BackendPort/docs   |" -ForegroundColor Green
Write-Host "  |  Debug      ->  http://localhost:$BackendPort/api/debug |" -ForegroundColor Green
Write-Host "  +------------------------------------------+" -ForegroundColor Green
Write-Host ""
Write-Host "  Backend PID:  $($backendJob.Id)   Frontend PID: $($frontendJob.Id)" -ForegroundColor Yellow
Write-Host "  To stop:  Stop-Process -Id $($backendJob.Id),$($frontendJob.Id) -Force" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Press Ctrl+C to exit this launcher (services keep running in background)" -ForegroundColor Gray

Wait-Process -Id $backendJob.Id -ErrorAction SilentlyContinue
