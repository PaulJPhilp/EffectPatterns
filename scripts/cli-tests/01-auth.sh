#!/usr/bin/env bash
set -euo pipefail

echo "[Tier 2] Auth"

npx effect-ai auth list || true
npx effect-ai auth show --json || true

echo "[Tier 2] OK"
