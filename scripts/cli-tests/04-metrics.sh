#!/usr/bin/env bash
set -euo pipefail

echo "[Tier 5] Metrics"

# JSON report to file (group flags must precede subcommand)
npx effect-ai metrics --json --force --output metrics.json report || true

# Last run in JSON via subcommand
npx effect-ai metrics last --json || true

# Console report
npx effect-ai metrics report || true

echo "[Tier 5] OK"
