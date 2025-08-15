#!/usr/bin/env bash
set -euo pipefail

if [[ "${RUN_NETWORK:-0}" != "1" ]]; then
  echo "[Tier 3] Health — SKIP (set RUN_NETWORK=1 to enable)"
  exit 0
fi

echo "[Tier 3] Health"

npx effect-ai health --provider openai --detailed

if [[ "${RUN_ALL_PROVIDERS:-0}" == "1" ]]; then
  npx effect-ai health --provider anthropic --detailed || true
  npx effect-ai health --provider google --detailed || true
fi

echo "[Tier 3] OK"
