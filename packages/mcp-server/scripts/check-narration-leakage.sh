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

# Check for patterns that indicate summary/documentation printing
# These should never appear in runtime code that executes during server startup
SUMMARY_PATTERNS=(
  "Implementation Complete"
  "Commit:"
  "Branch:"
  "# MCP 2.0"
  "MCP 2.0 Rich Content Implementation"
)

for pattern in "${SUMMARY_PATTERNS[@]}"; do
  # Escape special regex characters
  escaped_pattern=$(printf '%s\n' "$pattern" | sed 's/[[\.*^$()+?{|]/\\&/g')
  if grep -rn "$escaped_pattern" "$TARGET_DIR" --include="*.ts" --exclude-dir=node_modules 2>/dev/null | grep -v "\.test\.ts" | grep -v "README.md" | grep -v "\.mdx\?" | grep -v "//.*$escaped_pattern"; then
    echo -e "${YELLOW}⚠ WARNING: Pattern '$pattern' found in source code.${NC}"
    echo -e "${YELLOW}   Ensure this is not printed to stdout during server startup.${NC}"
    # Don't fail, but warn - might be in comments or string literals
  fi
done

echo ""

if [ $VIOLATIONS -eq 0 ]; then
  echo -e "${GREEN}✓ All checks passed. Tool narration will not leak to stdout.${NC}"
  echo -e "${GREEN}✓ All console output uses console.error/warn (stderr).${NC}"
  exit 0
else
  echo -e "${RED}✗ $VIOLATIONS violation(s) found. Fix before merging.${NC}"
  exit 1
fi