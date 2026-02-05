#!/usr/bin/env bash
set -euo pipefail

export SKIP_DELETE=1
export DATABASE_URL='postgresql://neondb_owner:npg_h7kGfWuV2syX@ep-blue-rain-ahdd1y9p-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'

bun run scripts/load-patterns.ts
