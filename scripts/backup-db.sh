#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BACKUP_DIR="${BACKUP_DIR:-/backups/itsal}"
mkdir -p "$BACKUP_DIR"
FILENAME="itsal_$(date +%Y%m%d_%H%M%S).sql.gz"

docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip > "$BACKUP_DIR/$FILENAME"

ls -t "$BACKUP_DIR"/itsal_*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm --

echo "Backup saved: $BACKUP_DIR/$FILENAME"
