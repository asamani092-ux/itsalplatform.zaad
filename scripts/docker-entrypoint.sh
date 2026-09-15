#!/bin/sh
set -e
cd /app

echo "[entrypoint] Running database migrations..."
node ./scripts/migrate-deploy.mjs

echo "[entrypoint] Starting app..."
exec node server.js
