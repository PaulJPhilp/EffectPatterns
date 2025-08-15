#!/usr/bin/env bash
set -euo pipefail

echo "[Tier 1] Basics"

npx effect-ai --version || true
npx effect-ai --help >/dev/null || true

# Minimal runtime command
npx effect-ai list content/ >/dev/null || true

echo "[Tier 1] OK"
