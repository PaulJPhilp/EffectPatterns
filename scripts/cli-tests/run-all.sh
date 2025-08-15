#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(dirname "$0")"

bash "$ROOT_DIR/00-basics.sh"
bash "$ROOT_DIR/01-auth.sh"
bash "$ROOT_DIR/04-metrics.sh"
bash "$ROOT_DIR/05-trace-run.sh"
bash "$ROOT_DIR/06-system-prompt.sh"

if [[ "${RUN_NETWORK:-0}" == "1" ]]; then
  bash "$ROOT_DIR/02-health.sh"
  bash "$ROOT_DIR/03-generate.sh"
fi

bash "$ROOT_DIR/99-error-handling.sh"

echo "[All tiers completed]"
