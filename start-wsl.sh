#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
#  SCSS AB Advocate — WSL Runner
#  Usage: bash start-wsl.sh
# ══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

# ── Paths ─────────────────────────────────────────────────────────────────────
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
VENV_DIR="$BACKEND_DIR/venv"
ENV_FILE="$BACKEND_DIR/.env"
FRONTEND_ENV="$FRONTEND_DIR/.env"
BACKEND_PORT=8001
FRONTEND_PORT=3000
BACKEND_PID=""

# ── Helpers ───────────────────────────────────────────────────────────────────
ok()   { echo -e "  ${GREEN}✓${NC} $*"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $*"; }
err()  { echo -e "  ${RED}✗${NC} $*" >&2; }
hdr()  { echo -e "\n${CYAN}${BOLD}▶ $*${NC}"; }

# ── Cleanup on exit ───────────────────────────────────────────────────────────
cleanup() {
  echo -e "\n${YELLOW}Shutting down...${NC}"
  if [[ -n "$BACKEND_PID" ]]; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
  echo -e "${GREEN}Done.${NC}"
}
trap cleanup EXIT INT TERM

# ── Banner ────────────────────────────────────────────────────────────────────
echo -e "${CYAN}${BOLD}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║       SCSS AB ADVOCATE — WSL RUNNER      ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${NC}"

# ══════════════════════════════════════════════════════════════════════════════
hdr "Checking prerequisites"
# ══════════════════════════════════════════════════════════════════════════════

need_cmd() {
  if ! command -v "$1" &>/dev/null; then
    err "'$1' not found. $2"
    exit 1
  fi
  ok "$1"
}

need_cmd python3   "Install Python 3.10+: sudo apt-get install python3 python3-venv"
need_cmd node      "Install Node.js 18+:  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install nodejs"
need_cmd npm       "npm should ship with Node.js (see above)"

# Python version check
PY_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
PY_MAJOR=${PY_VER%%.*}; PY_MINOR=${PY_VER##*.}
if (( PY_MAJOR < 3 || (PY_MAJOR == 3 && PY_MINOR < 10) )); then
  err "Python 3.10+ required (found $PY_VER). Install a newer version."
  exit 1
fi
ok "Python $PY_VER"

NODE_VER=$(node --version)
ok "Node $NODE_VER"

# ══════════════════════════════════════════════════════════════════════════════
hdr "Environment configuration"
# ══════════════════════════════════════════════════════════════════════════════

if [[ ! -f "$ENV_FILE" ]]; then
  warn "No $ENV_FILE found — creating from .env.example"
  cp "$PROJECT_DIR/.env.example" "$ENV_FILE"
  echo ""
  echo -e "  ${YELLOW}Please edit ${BOLD}$ENV_FILE${NC}${YELLOW} and set:${NC}"
  echo "    ANTHROPIC_API_KEY=sk-ant-..."
  echo "    MONGO_URL=mongodb://localhost:27017   (or an Atlas URI)"
  echo ""
  read -rp "  Press ENTER when .env is ready (Ctrl+C to abort)..."
fi

ok "backend/.env present"

# ══════════════════════════════════════════════════════════════════════════════
hdr "MongoDB"
# ══════════════════════════════════════════════════════════════════════════════

# Read MONGO_URL from env file (without fully sourcing it, to stay safe)
MONGO_URL_VAL=$(grep -E '^MONGO_URL=' "$ENV_FILE" | head -1 | cut -d'=' -f2- | tr -d '\r')

if [[ "$MONGO_URL_VAL" == *"localhost"* ]] || [[ "$MONGO_URL_VAL" == *"127.0.0.1"* ]]; then
  if pgrep -x mongod >/dev/null 2>&1; then
    ok "mongod is already running"
  elif command -v mongod &>/dev/null; then
    warn "mongod not running — attempting to start..."
    # Try common data-path locations
    MONGO_DATA=""
    for p in /var/lib/mongodb /data/db "$HOME/mongodb/data"; do
      if [[ -d "$p" ]]; then MONGO_DATA="$p"; break; fi
    done
    if [[ -z "$MONGO_DATA" ]]; then
      MONGO_DATA="$HOME/mongodb/data"
      mkdir -p "$MONGO_DATA"
    fi
    mongod --fork --logpath /tmp/mongod.log --dbpath "$MONGO_DATA" 2>/dev/null \
      && ok "mongod started (log: /tmp/mongod.log)" \
      || { err "Could not start mongod. Start it manually or use a cloud URI in backend/.env"; exit 1; }
    sleep 1
  else
    err "MongoDB not installed."
    echo ""
    echo "  Install options:"
    echo "    A) Local:  sudo apt-get install -y mongodb"
    echo "    B) Cloud:  Set MONGO_URL to a MongoDB Atlas URI in backend/.env"
    exit 1
  fi
else
  ok "Using remote MongoDB: ${MONGO_URL_VAL:0:35}..."
fi

# ══════════════════════════════════════════════════════════════════════════════
hdr "Python virtual environment"
# ══════════════════════════════════════════════════════════════════════════════

if [[ ! -d "$VENV_DIR" ]]; then
  echo "  Creating venv at $VENV_DIR ..."
  python3 -m venv "$VENV_DIR"
fi
# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"
ok "Virtual environment active"

echo "  Installing/updating backend dependencies..."
pip install -q --upgrade pip
pip install -q -r "$BACKEND_DIR/requirements.txt"
ok "Backend dependencies installed"

# ══════════════════════════════════════════════════════════════════════════════
hdr "Frontend"
# ══════════════════════════════════════════════════════════════════════════════

# Write frontend .env if missing
if [[ ! -f "$FRONTEND_ENV" ]]; then
  echo "REACT_APP_BACKEND_URL=http://localhost:$BACKEND_PORT" > "$FRONTEND_ENV"
  ok "Created frontend/.env  (REACT_APP_BACKEND_URL=http://localhost:$BACKEND_PORT)"
else
  ok "frontend/.env present"
fi

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "  Installing frontend dependencies (first run — may take ~1 min)..."
  npm install --prefix "$FRONTEND_DIR" --legacy-peer-deps --silent
  ok "Frontend dependencies installed"
else
  ok "Frontend node_modules already present"
fi

# ══════════════════════════════════════════════════════════════════════════════
hdr "Starting services"
# ══════════════════════════════════════════════════════════════════════════════

# Backend — background
echo "  Starting FastAPI backend on port $BACKEND_PORT ..."
cd "$BACKEND_DIR"
uvicorn server:app \
  --host 0.0.0.0 \
  --port "$BACKEND_PORT" \
  --reload \
  --log-level warning \
  &
BACKEND_PID=$!
ok "Backend PID $BACKEND_PID  →  http://localhost:$BACKEND_PORT"

# Give backend 2 seconds to bind
sleep 2
if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
  err "Backend failed to start. Check logs above."
  exit 1
fi

echo ""
echo -e "  ${CYAN}${BOLD}════════════════════════════════════════════${NC}"
echo -e "  ${GREEN}${BOLD}  Frontend:  http://localhost:$FRONTEND_PORT${NC}"
echo -e "  ${GREEN}        API:  http://localhost:$BACKEND_PORT/docs${NC}"
echo -e "  ${CYAN}${BOLD}════════════════════════════════════════════${NC}"
echo ""
echo -e "  Press ${BOLD}Ctrl+C${NC} to stop both services."
echo ""

# Frontend — foreground (blocks until Ctrl+C)
BROWSER=none PORT=$FRONTEND_PORT npm start --prefix "$FRONTEND_DIR"
