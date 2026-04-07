#!/bin/bash
# ============================================================
#  SCSS AB Advocate — Docker Entrypoint
# ============================================================

set -e

echo ""
echo "  +------------------------------------------+"
echo "  |     SCSS AB ADVOCATE — DOCKER RUNNER     |"
echo "  +------------------------------------------+"
echo ""

# Validate required env vars
if [ -z "$MONGO_URL" ]; then
  echo "  [XX] ERROR: MONGO_URL is not set"
  echo "       Run with: docker run -e MONGO_URL=mongodb+srv://... ..."
  exit 1
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "  [!!] WARNING: ANTHROPIC_API_KEY not set — Claude AI will not work"
fi

echo "  [OK] Environment validated"
echo "  [OK] MongoDB: ${MONGO_URL:0:40}..."
echo "  [OK] DB Name: ${DB_NAME:-scss_advocate}"

# Write backend .env from environment variables
cat > /app/backend/.env <<EOF
MONGO_URL=${MONGO_URL}
DB_NAME=${DB_NAME:-scss_advocate}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
XAI_API_KEY=${XAI_API_KEY:-}
EOF

echo "  [OK] backend/.env written from environment"

# Serve React build on port 3000 via Python http.server
echo "  [OK] Starting frontend on port 3000..."
cd /app/frontend/build && python3 -m http.server 3000 &
FRONTEND_PID=$!

# Start FastAPI backend on port 8001
echo "  [OK] Starting backend on port 8001..."
cd /app/backend
python3 -m uvicorn server:app --host 0.0.0.0 --port 8001 --log-level warning &
BACKEND_PID=$!

echo ""
echo "  +------------------------------------------+"
echo "  |  Frontend  ->  http://localhost:3000     |"
echo "  |  API       ->  http://localhost:8001     |"
echo "  |  API Docs  ->  http://localhost:8001/docs|"
echo "  +------------------------------------------+"
echo ""

# Keep container alive — exit if either process dies
wait -n $FRONTEND_PID $BACKEND_PID
