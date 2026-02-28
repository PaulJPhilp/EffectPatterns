#!/usr/bin/env bash
#
# Test MCP Server Against Staging Environment
#
# Prerequisites:
#   - Set STAGING_API_KEY environment variable
#
# Usage:
#   STAGING_API_KEY=your-key ./scripts/test-mcp-staging.sh
#

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Testing MCP Server - Staging Environment${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Validate env
MCP_ENV=staging bun run scripts/check-env-for-deploy.ts

# Health check
bun run scripts/smoke-health.ts staging

# Set environment variables
export MCP_ENV=staging
export PATTERN_API_KEY="${STAGING_API_KEY:-${PATTERN_API_KEY:-}}"
export EFFECT_PATTERNS_API_URL="https://effect-patterns-mcp-staging.vercel.app"

echo -e "\n${BLUE}Running MCP protocol tests against staging server...${NC}\n"

bunx vitest run --config vitest.mcp.config.ts \
    tests/mcp-protocol/client-stdio.test.ts \
    tests/mcp-protocol/structured-output.test.ts

echo -e "\n${BLUE}Running smoke tests against staging...${NC}\n"

bunx vitest run --config vitest.smoke.config.ts

echo -e "\n${GREEN}✓ Staging MCP tests completed${NC}"
