#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker غير مثبت. راجع README.md"
  exit 1
fi

if [ ! -S /var/run/docker.sock ]; then
  echo "تشغيل Docker daemon..."
  sudo service docker start || sudo dockerd --iptables=false >/tmp/dockerd.log 2>&1 &
  sleep 3
fi

if [ ! -w /var/run/docker.sock ]; then
  sudo chmod 666 /var/run/docker.sock 2>/dev/null || true
fi

docker compose up -d "$@"
docker compose ps
