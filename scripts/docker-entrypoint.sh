#!/bin/sh
set -e
cd /app

echo "[entrypoint] Running prisma migrate deploy..."
node ./scripts/migrate-deploy.mjs

echo "[entrypoint] Starting app..."
exec node server.js
