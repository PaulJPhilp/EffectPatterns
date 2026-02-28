#!/usr/bin/env bash
#
# Test MCP Server Against Production Environment
#
# Prerequisites:
#   - Set PRODUCTION_API_KEY environment variable
#
# Usage:
#   PRODUCTION_API_KEY=your-key ./scripts/test-mcp-production.sh
#

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Testing MCP Server - Production Environment${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Validate env
MCP_ENV=production bun run scripts/check-env-for-deploy.ts

# Health check
bun run scripts/smoke-health.ts production

# Set environment variables
export MCP_ENV=production
export PATTERN_API_KEY="${PRODUCTION_API_KEY:-${PATTERN_API_KEY:-}}"
export EFFECT_PATTERNS_API_URL="https://effect-patterns-mcp.vercel.app"

echo -e "\n${BLUE}Running MCP protocol tests against production server...${NC}\n"

bunx vitest run --config vitest.mcp.config.ts \
    tests/mcp-protocol/client-stdio.test.ts \
    tests/mcp-protocol/structured-output.test.ts

echo -e "\n${BLUE}Running smoke tests against production...${NC}\n"

bunx vitest run --config vitest.smoke.config.ts

echo -e "\n${GREEN}✓ Production MCP tests completed${NC}"
