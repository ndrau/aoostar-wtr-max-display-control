#!/bin/sh
set -eu

mkdir -p /data/uploads

echo "[entrypoint] applying display configuration"
if ! node /app/scripts/apply-boot.mjs; then
  echo "[entrypoint] boot apply failed, starting web UI anyway"
fi

echo "[entrypoint] starting web UI on port ${PORT:-3000}"
cd /app
exec node server.js
