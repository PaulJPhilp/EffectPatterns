#!/bin/bash
set -e

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
    bun add -g vercel
fi

echo "✓ Vercel CLI found"
echo ""

# Check if project is linked
if [ ! -d ".vercel" ]; then
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

vercel --env preview

echo ""
echo "${GREEN}✓ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Check the deployment URL above"
echo "  2. Run smoke tests:"
echo "     ${GREEN}bun run smoke-test <DEPLOYMENT_URL> <API_KEY>${NC}"
echo ""
