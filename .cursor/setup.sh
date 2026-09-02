#!/usr/bin/env bash
# Idempotent Cloud Agent bootstrap for the Jarvi monorepo.
# Installs dependencies, builds the shared + backend packages, and creates
# local dev .env files (with placeholder secrets) when they are missing.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "[setup] Installing workspace dependencies..."
npm install

echo "[setup] Building shared package..."
npm run build:shared

echo "[setup] Building backend package..."
npm run build:backend

BACKEND_ENV="packages/backend/.env"
if [ ! -f "$BACKEND_ENV" ]; then
  echo "[setup] Creating $BACKEND_ENV with dev placeholders..."
  JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"
  cat > "$BACKEND_ENV" <<EOF
PORT=3001
NODE_ENV=development
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
RESEND_API_KEY=re_dev_placeholder
GOOGLE_CLIENT_ID=placeholder.apps.googleusercontent.com
FRONTEND_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000
APP_URL=http://localhost:3000
EOF
else
  echo "[setup] $BACKEND_ENV already exists, leaving it untouched."
fi

WEB_ENV="packages/web/.env"
if [ ! -f "$WEB_ENV" ]; then
  echo "[setup] Creating $WEB_ENV..."
  # Base URL WITHOUT a trailing /api: the web client prepends /api itself.
  echo "VITE_API_URL=http://localhost:3001" > "$WEB_ENV"
else
  echo "[setup] $WEB_ENV already exists, leaving it untouched."
fi

echo "[setup] Done."
