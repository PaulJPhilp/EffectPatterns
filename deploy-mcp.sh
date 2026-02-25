#!/bin/bash

# Deploy MCP server to Vercel
# This script handles the deployment from the correct directory

echo "🚀 Deploying MCP server to Vercel..."

# Navigate to the mcp-server package directory
cd "$(dirname "$0")/packages/api-server"

# Remove any existing vercel link
rm -rf .vercel

# Create a new deployment with a unique name
echo "📦 Creating new deployment..."
vercel --name effect-patterns-mcp-server-$(date +%s) --prod

echo "✅ Deployment complete!"
