# ============================================================
#  SCSS AB Advocate — Docker Image
#  Frontend: pre-built React static files (built on host)
#  Backend:  Python FastAPI + Uvicorn
# ============================================================

FROM python:3.13-slim

WORKDIR /app

# Install Python backend dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy pre-built React frontend (built with: cd frontend && npm run build)
COPY frontend/build ./frontend/build

# Copy entrypoint
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 8001 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
