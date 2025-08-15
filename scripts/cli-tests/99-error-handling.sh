#!/usr/bin/env bash
set -euo pipefail

# Intentionally trigger invalid usage to ensure graceful errors
# Do not 'set -e' for the next lines to allow non-zero exits
set +e

echo "[Tier 8] Error handling — unknown subcommand"
npx effect-ai does-not-exist
ECODE=$?
echo "Exit code: $ECODE"

echo "[Tier 8] Error handling — wrong flag placement"
npx effect-ai metrics report --json
ECODE=$?
echo "Exit code: $ECODE"

set -e

echo "[Tier 8] OK (errors above are expected)"
