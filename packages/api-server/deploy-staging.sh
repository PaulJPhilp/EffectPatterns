#!/bin/bash
set -euo pipefail

echo "========================================="
echo "MCP Server - Staging Deployment"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if vercel is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    bun add -g vercel@latest
fi

echo "✓ Vercel CLI found"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
STAGING_DOMAIN="effect-patterns-mcp-staging.vercel.app"

cd "${ROOT_DIR}"

# Check if project is linked
if [ ! -d "${ROOT_DIR}/.vercel" ]; then
    echo "${YELLOW}⚠ Project not linked to Vercel${NC}"
    echo ""
    echo "Please run the following commands manually:"
    echo ""
    echo "  1. Link to Vercel:"
    echo "     ${GREEN}vercel link${NC}"
    echo ""
    echo "  2. Set environment variables:"
    echo "     ${GREEN}vercel env add PATTERN_API_KEY preview${NC}"
    echo "     ${GREEN}vercel env add SERVICE_NAME preview${NC}"
    echo "     ${GREEN}vercel env add OTLP_ENDPOINT preview${NC}"
    echo "     ${GREEN}vercel env add OTLP_HEADERS preview${NC}"
    echo ""
    echo "  3. Run this script again"
    echo ""
    exit 1
fi

echo "✓ Project linked to Vercel"
echo ""

# Deploy to staging (preview environment)
echo "🚀 Deploying to staging..."
echo ""

DEPLOY_OUTPUT="$(vercel --target preview 2>&1 | tee /dev/stderr)"
DEPLOY_URL="$(printf "%s\n" "${DEPLOY_OUTPUT}" | grep -Eo 'https://[^ ]+\.vercel\.app' | tail -n1 || true)"

if [ -z "${DEPLOY_URL}" ]; then
    echo "❌ Could not determine deployed preview URL from Vercel output."
    exit 1
fi

echo ""
echo "🔗 Pointing ${STAGING_DOMAIN} to ${DEPLOY_URL}..."
vercel alias set "${DEPLOY_URL}" "${STAGING_DOMAIN}"

echo ""
echo "${GREEN}✓ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Check staging health:"
echo "     ${GREEN}curl https://${STAGING_DOMAIN}/api/health${NC}"
echo "  2. Run smoke tests:"
echo "     ${GREEN}STAGING_API_KEY=<key> bun run test:mcp:staging${NC}"
echo ""
