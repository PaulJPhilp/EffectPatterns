#!/usr/bin/env bash
set -euo pipefail

DB_URL='postgresql://neondb_owner:npg_h7kGfWuV2syX@ep-blue-rain-ahdd1y9p-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'

psql "$DB_URL" -c "DELETE FROM effect_patterns;"
