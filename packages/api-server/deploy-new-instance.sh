#!/bin/bash
set -e

echo "========================================="
echo "MCP Server - New Instance Deployment"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if vercel is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    bun add -g vercel@latest
fi

echo "✓ Vercel CLI found"
echo ""

# Prompt for new project name
echo "${BLUE}Enter a name for the new MCP server instance:${NC}"
echo "(e.g., 'effect-patterns-mcp-v2' or 'effect-patterns-mcp-dev')"
read -p "Project name: " PROJECT_NAME

if [ -z "$PROJECT_NAME" ]; then
    echo "❌ Project name cannot be empty"
    exit 1
fi

echo ""
echo "${YELLOW}⚠ This will create a NEW Vercel project: ${PROJECT_NAME}${NC}"
echo ""
echo "Current production: effect-patterns-mcp.vercel.app"
echo "New deployment:     ${PROJECT_NAME}.vercel.app"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

# Backup existing .vercel directory if it exists
if [ -d ".vercel" ]; then
    echo "📦 Backing up existing Vercel link..."
    mv .vercel .vercel.backup
    echo "✓ Backup created at .vercel.backup"
fi

echo ""
echo "🚀 Deploying new instance: ${PROJECT_NAME}..."
echo ""

# Deploy with new project name
vercel --name "$PROJECT_NAME" --prod

DEPLOYMENT_URL="${PROJECT_NAME}.vercel.app"

echo ""
echo "${GREEN}✓ Deployment complete!${NC}"
echo ""
echo "Deployment URL: https://${DEPLOYMENT_URL}"
echo ""
echo "Next steps:"
echo "  1. Set environment variables for the new project:"
echo "     ${GREEN}vercel env add PATTERN_API_KEY production${NC}"
echo "     ${GREEN}vercel env add DATABASE_URL production${NC}"
echo "     ${GREEN}vercel env add SERVICE_NAME production${NC}"
echo "     ${GREEN}vercel env add OTLP_ENDPOINT production${NC}"
echo ""
echo "  2. Run smoke tests:"
echo "     ${GREEN}bun run smoke-test https://${DEPLOYMENT_URL} <API_KEY>${NC}"
echo ""
echo "  3. To restore original Vercel link:"
echo "     ${GREEN}rm -rf .vercel && mv .vercel.backup .vercel${NC}"
echo ""
