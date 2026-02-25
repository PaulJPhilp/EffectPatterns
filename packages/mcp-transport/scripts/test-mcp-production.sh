#!/usr/bin/env bash

#
# Test MCP Server Against Production Environment
#
# This script tests the MCP server stdio interface against the production deployment.
#
# Prerequisites:
#   - Set PRODUCTION_API_KEY environment variable
#
# Usage:
#   PRODUCTION_API_KEY=your-key ./scripts/test-mcp-production.sh
#

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Testing MCP Server - Production Environment${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check API key
if [ -z "${PRODUCTION_API_KEY:-}" ]; then
    echo -e "${RED}❌ PRODUCTION_API_KEY environment variable is required${NC}"
    echo -e "${YELLOW}Usage:${NC}"
    echo -e "  ${GREEN}PRODUCTION_API_KEY=your-key ./scripts/test-mcp-production.sh${NC}"
    exit 1
fi

PRODUCTION_URL="https://effect-patterns-mcp.vercel.app"
echo -e "${YELLOW}Checking production server at ${PRODUCTION_URL}...${NC}"

# Check if production server is available
if ! curl -s -f "${PRODUCTION_URL}/api/health" > /dev/null 2>&1; then
    echo -e "${RED}❌ Production server not available at ${PRODUCTION_URL}${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Production server is available${NC}\n"

# Set environment variables
export MCP_ENV=production
export PATTERN_API_KEY="${PRODUCTION_API_KEY}"
export EFFECT_PATTERNS_API_URL="${PRODUCTION_URL}"

echo -e "${BLUE}Running MCP protocol tests against production server...${NC}\n"

# Run MCP tests with production config
bunx vitest run --config vitest.mcp.config.ts \
    tests/mcp-protocol/client-stdio.test.ts \
    tests/mcp-protocol/structured-output.test.ts

echo -e "\n${GREEN}✓ Production MCP tests completed${NC}"
