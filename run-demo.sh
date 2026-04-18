#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo "Starting Inbox Guardian demo setup..."

if [ ! -d backend/.venv ]; then
  python3 -m venv backend/.venv
fi

source backend/.venv/bin/activate
pip install -r backend/requirements.txt >/dev/null

if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
fi

if [ ! -f frontend/.env.local ]; then
  cp frontend/.env.local.example frontend/.env.local
fi

(cd frontend && npm install >/dev/null)

echo "Launching backend on http://localhost:8000"
( cd backend && . .venv/bin/activate && uvicorn app.main:app --reload --port 8000 ) &
BACKEND_PID=$!

echo "Launching frontend on http://localhost:3000"
( cd frontend && npm run dev ) &
FRONTEND_PID=$!

cleanup() {
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
}
trap cleanup EXIT

wait
