#!/usr/bin/env bash

#
# Test MCP Server Against Local Environment
#
# This script tests the MCP server stdio interface against a local development server.
#
# Prerequisites:
#   - Local API server running on http://localhost:3000
#   - Set PATTERN_API_KEY or LOCAL_API_KEY environment variable
#
# Usage:
#   ./scripts/test-mcp-local.sh
#   LOCAL_API_KEY=your-key ./scripts/test-mcp-local.sh
#

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Testing MCP Server - Local Environment${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if local server is running
LOCAL_URL="${EFFECT_PATTERNS_API_URL:-http://localhost:3000}"
echo -e "${YELLOW}Checking local server at ${LOCAL_URL}...${NC}"

if ! curl -s -f "${LOCAL_URL}/api/health" > /dev/null 2>&1; then
    echo -e "${RED}❌ Local server not available at ${LOCAL_URL}${NC}"
    echo -e "${YELLOW}Start the local server with:${NC}"
    echo -e "  ${GREEN}cd packages/api-server && bun run dev${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Local server is running${NC}\n"

# Set API key
if [ -z "${PATTERN_API_KEY:-}" ] && [ -z "${LOCAL_API_KEY:-}" ]; then
    echo -e "${YELLOW}⚠ No API key set. Using default test key.${NC}"
    export PATTERN_API_KEY="${LOCAL_API_KEY:-test-api-key}"
fi

# Set environment
export MCP_ENV=local
export EFFECT_PATTERNS_API_URL="${LOCAL_URL}"

echo -e "${BLUE}Running MCP protocol tests against local server...${NC}\n"

# Run tests
bunx vitest run --config vitest.mcp.config.ts tests/mcp-protocol/local.test.ts

echo -e "\n${GREEN}✓ Local MCP tests completed${NC}"
