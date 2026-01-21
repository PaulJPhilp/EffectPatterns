#!/usr/bin/env bash

#
# Test MCP Server Against Staging Environment
#
# This script tests the MCP server stdio interface against the staging deployment.
#
# Prerequisites:
#   - Set STAGING_API_KEY environment variable
#
# Usage:
#   STAGING_API_KEY=your-key ./scripts/test-mcp-staging.sh
#

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Testing MCP Server - Staging Environment${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check API key
if [ -z "${STAGING_API_KEY:-}" ]; then
    echo -e "${RED}❌ STAGING_API_KEY environment variable is required${NC}"
    echo -e "${YELLOW}Usage:${NC}"
    echo -e "  ${GREEN}STAGING_API_KEY=your-key ./scripts/test-mcp-staging.sh${NC}"
    exit 1
fi

STAGING_URL="https://effect-patterns-mcp-staging.vercel.app"
echo -e "${YELLOW}Checking staging server at ${STAGING_URL}...${NC}"

# Check if staging server is available
if ! curl -s -f "${STAGING_URL}/api/health" > /dev/null 2>&1; then
    echo -e "${RED}❌ Staging server not available at ${STAGING_URL}${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Staging server is available${NC}\n"

# Set environment variables
export MCP_ENV=staging
export PATTERN_API_KEY="${STAGING_API_KEY}"
export EFFECT_PATTERNS_API_URL="${STAGING_URL}"

echo -e "${BLUE}Running MCP protocol tests against staging server...${NC}\n"

# Run MCP tests with staging config
bunx vitest run --config vitest.mcp.config.ts tests/mcp-protocol/client-stdio.test.ts tests/mcp-protocol/tools.test.ts

echo -e "\n${GREEN}✓ Staging MCP tests completed${NC}"
