#!/bin/sh
set -e

mkdir -p /data/uploads

echo "[entrypoint] applying display configuration"
node /app/scripts/apply-boot.mjs

echo "[entrypoint] starting web UI on port ${PORT:-3000}"
cd /app
exec node server.js
