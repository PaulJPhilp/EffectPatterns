#!/usr/bin/env bash

#
# Test MCP Server Against All Environments
#
# This script tests the MCP server stdio interface against local, staging, and production.
#
# Prerequisites:
#   - Local server running (for local tests)
#   - Set STAGING_API_KEY and PRODUCTION_API_KEY environment variables
#
# Usage:
#   ./scripts/test-mcp-all.sh
#   STAGING_API_KEY=staging-key PRODUCTION_API_KEY=prod-key ./scripts/test-mcp-all.sh
#

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Testing MCP Server - All Environments${NC}"
echo -e "${BLUE}========================================${NC}\n"

FAILED=0

# Test Local
echo -e "\n${BLUE}[1/3] Testing Local Environment${NC}"
if ./scripts/test-mcp-local.sh; then
    echo -e "${GREEN}✓ Local tests passed${NC}"
else
    echo -e "${RED}✗ Local tests failed${NC}"
    FAILED=1
fi

# Test Staging
echo -e "\n${BLUE}[2/3] Testing Staging Environment${NC}"
if [ -z "${STAGING_API_KEY:-}" ]; then
    echo -e "${YELLOW}⚠ STAGING_API_KEY not set, skipping staging tests${NC}"
else
    if ./scripts/test-mcp-staging.sh; then
        echo -e "${GREEN}✓ Staging tests passed${NC}"
    else
        echo -e "${RED}✗ Staging tests failed${NC}"
        FAILED=1
    fi
fi

# Test Production
echo -e "\n${BLUE}[3/3] Testing Production Environment${NC}"
if [ -z "${PRODUCTION_API_KEY:-}" ]; then
    echo -e "${YELLOW}⚠ PRODUCTION_API_KEY not set, skipping production tests${NC}"
else
    if ./scripts/test-mcp-production.sh; then
        echo -e "${GREEN}✓ Production tests passed${NC}"
    else
        echo -e "${RED}✗ Production tests failed${NC}"
        FAILED=1
    fi
fi

# Summary
echo -e "\n${BLUE}========================================${NC}"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All MCP tests completed successfully${NC}"
    exit 0
else
    echo -e "${RED}✗ Some MCP tests failed${NC}"
    exit 1
fi
