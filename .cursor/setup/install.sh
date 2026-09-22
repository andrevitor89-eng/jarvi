#!/usr/bin/env bash
# Idempotent Cloud Agent install script for Jarvi.
# Installs workspace dependencies, creates dev env files (with placeholders
# only — no real secrets), and builds the shared + backend packages so the
# backend (port 3001) and web (port 3000) dev servers can start.
set -euo pipefail

# Resolve repo root relative to this script (.cursor/setup/install.sh).
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "==> Installing workspace dependencies"
npm install

# --- Backend dev env (placeholders only; file is gitignored) -----------------
BACKEND_ENV="packages/backend/.env"
if [ ! -f "$BACKEND_ENV" ]; then
  echo "==> Creating $BACKEND_ENV"
  JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"
  cat > "$BACKEND_ENV" <<EOF
NODE_ENV=development
PORT=3001
DATABASE_URL=sqlite:./jarvi.db
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d
# Placeholder — the Resend SDK throws at startup if this is missing.
RESEND_API_KEY=re_dev_placeholder
# Placeholder — real Google OAuth requires valid credentials.
GOOGLE_CLIENT_ID=dev-placeholder.apps.googleusercontent.com
FRONTEND_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000
APP_URL=http://localhost:3000
APP_LOGIN_URL=http://localhost:3000/login
EOF
else
  echo "==> $BACKEND_ENV already exists, leaving as-is"
fi

# --- Web dev env --------------------------------------------------------------
WEB_ENV="packages/web/.env"
if [ ! -f "$WEB_ENV" ]; then
  echo "==> Creating $WEB_ENV"
  cat > "$WEB_ENV" <<EOF
VITE_API_URL=http://localhost:3001/api
EOF
else
  echo "==> $WEB_ENV already exists, leaving as-is"
fi

# --- Build shared (consumed by web/backend) then backend ----------------------
echo "==> Building @jarvi/shared"
npm run build:shared

echo "==> Building @jarvi/backend"
npm run build:backend

echo "==> Install complete"
