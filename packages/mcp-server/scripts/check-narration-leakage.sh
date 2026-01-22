#!/bin/bash

# Guardrail: Prevent tool narration/debug logs from leaking into user-visible output.
#
# This script enforces that all debugging output uses console.error() (stderr),
# never console.log/console.info/console.warn (stdout).
#
# Rule: No console.log, console.info, console.warn in src/ (except vendor code)
# Allowed: console.error only
#
# Exit code: 0 if all checks pass, 1 if violations found

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

VIOLATIONS=0

echo "🔍 Checking for tool narration leakage in src/..."
echo ""

# Check for console.log
if grep -rn "console\.log(" src/ --include="*.ts" --exclude-dir=node_modules 2>/dev/null | grep -v "\.test\.ts"; then
  echo -e "${RED}✗ VIOLATION: console.log() found in src/. Use console.error() instead.${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Check for console.info
if grep -rn "console\.info(" src/ --include="*.ts" --exclude-dir=node_modules 2>/dev/null | grep -v "\.test\.ts"; then
  echo -e "${RED}✗ VIOLATION: console.info() found in src/. Use console.error() instead.${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Check for console.warn
if grep -rn "console\.warn(" src/ --include="*.ts" --exclude-dir=node_modules 2>/dev/null | grep -v "\.test\.ts"; then
  echo -e "${RED}✗ VIOLATION: console.warn() found in src/. Use console.error() instead.${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

echo ""

if [ $VIOLATIONS -eq 0 ]; then
  echo -e "${GREEN}✓ All checks passed. Tool narration will not leak to stdout.${NC}"
  echo -e "${GREEN}✓ All console output uses console.error() (stderr only).${NC}"
  exit 0
else
  echo -e "${RED}✗ $VIOLATIONS violation(s) found. Fix before merging.${NC}"
  exit 1
fi
