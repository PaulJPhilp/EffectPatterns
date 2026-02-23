#!/usr/bin/env bash
set -euo pipefail

# Run DB migrations for Preview (staging) so staging DB is up to date.
# Production uses same buildCommand but DATABASE_URL is production; no separate step.
if [ "${VERCEL_ENV:-}" = "preview" ]; then
  echo "VERCEL_ENV=preview: running database migrations..."
  bun run db:migrate || { echo "db:migrate failed"; exit 1; }
fi

cd packages/mcp-server && npx next build
