#!/usr/bin/env bash
#
# Test MCP Server Against Local Environment
#
# Prerequisites:
#   - Local API server running on http://localhost:3000
#
# Usage:
#   ./scripts/test-mcp-local.sh
#

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Testing MCP Server - Local Environment${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Health check
bun run scripts/smoke-health.ts local

# Set environment
export MCP_ENV=local
export EFFECT_PATTERNS_API_URL="${EFFECT_PATTERNS_API_URL:-http://localhost:3000}"

echo -e "\n${BLUE}Running MCP protocol tests against local server...${NC}\n"

bunx vitest run --config vitest.mcp.config.ts tests/mcp-protocol/local.test.ts

echo -e "\n${GREEN}✓ Local MCP tests completed${NC}"
