#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Pulling latest code..."
git pull origin cursor/zaad-portal-architecture-f122

echo "Building and starting containers..."
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

echo "Running database migrations..."
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

echo "Deployment complete. Check: docker compose -f docker-compose.prod.yml logs -f app"
