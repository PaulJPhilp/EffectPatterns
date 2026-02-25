#!/usr/bin/env bash
set -euo pipefail

# Run DB migrations for Preview (staging) and Production so databases stay up to date.
if [ "${VERCEL_ENV:-}" = "preview" ] || [ "${VERCEL_ENV:-}" = "production" ]; then
  echo "VERCEL_ENV=${VERCEL_ENV}: running database migrations..."
  bun run db:migrate || { echo "db:migrate failed"; exit 1; }
fi

cd packages/api-server && npx next build
