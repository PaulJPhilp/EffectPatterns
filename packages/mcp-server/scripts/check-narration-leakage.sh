#!/bin/bash

# Guardrail: Prevent tool narration/debug logs from leaking into user-visible output.
#
# This script enforces that all debugging output uses console.error() (stderr),
# never console.log/console.info/console.debug/process.stdout.write (stdout).
#
# Rule: No stdout logging in packages/mcp-server/src/
# Allowed: console.error, console.warn (verified: both target stderr in Bun/Node)
#
# Exit code: 0 if all checks pass, 1 if violations found

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

VIOLATIONS=0
TARGET_DIR="packages/mcp-server/src"

# Handle running from package root vs monorepo root
if [ ! -d "$TARGET_DIR" ]; then
  if [ -d "src" ]; then
    TARGET_DIR="src"
  else
    echo "Error: Could not find src directory."
    exit 1
  fi
fi

echo "🔍 Checking for stdout leakage in $TARGET_DIR..."
echo ""

# Check for console.log
if grep -rn "console\.log(" "$TARGET_DIR" --include="*.ts" --exclude-dir=node_modules 2>/dev/null | grep -v "\.test\.ts"; then
  echo -e "${RED}✗ VIOLATION: console.log() found. Use console.error() instead.${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Check for console.info
if grep -rn "console\.info(" "$TARGET_DIR" --include="*.ts" --exclude-dir=node_modules 2>/dev/null | grep -v "\.test\.ts"; then
  echo -e "${RED}✗ VIOLATION: console.info() found. Use console.error() instead.${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Check for console.debug
if grep -rn "console\.debug(" "$TARGET_DIR" --include="*.ts" --exclude-dir=node_modules 2>/dev/null | grep -v "\.test\.ts"; then
  echo -e "${RED}✗ VIOLATION: console.debug() found. Use console.error() instead.${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Check for process.stdout.write
if grep -rn "process\.stdout\.write(" "$TARGET_DIR" --include="*.ts" --exclude-dir=node_modules 2>/dev/null | grep -v "\.test\.ts"; then
  echo -e "${RED}✗ VIOLATION: process.stdout.write() found. Use console.error() instead.${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

echo ""

if [ $VIOLATIONS -eq 0 ]; then
  echo -e "${GREEN}✓ All checks passed. Tool narration will not leak to stdout.${NC}"
  echo -e "${GREEN}✓ All console output uses console.error/warn (stderr).${NC}"
  exit 0
else
  echo -e "${RED}✗ $VIOLATIONS violation(s) found. Fix before merging.${NC}"
  exit 1
fi