#!/usr/bin/env bash
set -euo pipefail

if [[ "${RUN_NETWORK:-0}" != "1" ]]; then
  echo "[Tier 4] Generate — SKIP (set RUN_NETWORK=1 to enable)"
  exit 0
fi

echo "[Tier 4] Generate (OpenAI minimal prompt)"

# Allow models to be overridden via env, with sane defaults
MODEL_OPENAI="${MODEL_OPENAI:-gpt-3.5-turbo}"
MODEL_ANTHROPIC="${MODEL_ANTHROPIC:-claude-3-5-haiku}"
MODEL_GOOGLE="${MODEL_GOOGLE:-gemini-2.5-flash}"

printf "Hello" | npx effect-ai generate \
  --provider openai --model "$MODEL_OPENAI" \
  --stdin --no-stream --quiet

if [[ "${RUN_ALL_PROVIDERS:-0}" == "1" ]]; then
  printf "Hello" | npx effect-ai generate \
    --provider anthropic --model "$MODEL_ANTHROPIC" \
    --stdin --no-stream --quiet || true

  printf "Hello" | npx effect-ai generate \
    --provider google --model "$MODEL_GOOGLE" \
    --stdin --no-stream --quiet || true
fi

echo "[Tier 4] OK"
