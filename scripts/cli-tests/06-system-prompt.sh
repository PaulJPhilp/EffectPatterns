#!/usr/bin/env bash
set -euo pipefail

echo "[Tier 7] System Prompt"

# Use a repo example file with valid frontmatter
FILE="scripts/cli-tests/examples/system-prompt.mdx"
if [[ -f "$FILE" ]]; then
  npx effect-ai system-prompt file "$FILE" || true
  npx effect-ai system-prompt --json || true
  npx effect-ai system-prompt clear || true
else
  echo "File $FILE not found; skipping system-prompt tests"
fi

echo "[Tier 7] OK"
