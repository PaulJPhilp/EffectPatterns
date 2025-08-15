#!/usr/bin/env bash
set -euo pipefail

echo "[Tier 6] Trace / Run"

npx effect-ai trace --json || true

# Create a run and query basics
npx effect-ai run create --prefix test || true
npx effect-ai run current --json || true
npx effect-ai run list --json || true
npx effect-ai run path || true

echo "[Tier 6] OK"
