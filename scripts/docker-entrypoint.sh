#!/bin/sh
set -e
cd /app

if [ -z "$DATABASE_URL" ]; then
  echo "[entrypoint] DATABASE_URL is missing — cannot migrate"
  exit 1
fi

echo "[entrypoint] Running prisma migrate deploy..."
if [ -x ./node_modules/.bin/prisma ]; then
  ./node_modules/.bin/prisma migrate deploy
elif [ -f ./node_modules/prisma/build/index.js ]; then
  node ./node_modules/prisma/build/index.js migrate deploy
else
  echo "[entrypoint] prisma CLI missing in image"
  exit 1
fi

echo "[entrypoint] Starting app..."
exec node server.js
