#!/bin/bash

echo "🔄 Restarting Windsurf MCP Configuration..."

# Kill all Windsurf processes
echo "📱 Killing Windsurf processes..."
pkill -f Windsurf 2>/dev/null || true
sleep 3

# Clear Windsurf cache
echo "🧹 Clearing Windsurf cache..."
rm -rf ~/Library/Application\ Support/Windsurf/User/ 2>/dev/null || true

# Verify MCP server is running
echo "🔍 Checking MCP server status..."
if curl -s http://localhost:3002/api/health > /dev/null 2>&1; then
    echo "✅ MCP server is running on http://localhost:3002"
else
    echo "❌ MCP server is not running. Starting it..."
    cd /Users/paul/Projects/Public/Effect-Patterns/packages/mcp-server
    PORT=3002 bun run dev &
    sleep 5
fi

# Verify configuration
echo "📋 MCP Configuration:"
cat /Users/paul/Projects/Public/Effect-Patterns/.windsurf/mcp_config.json

echo ""
echo "🎯 Configuration complete!"
echo "📝 Next steps:"
echo "   1. Start Windsurf application"
echo "   2. Wait for MCP connection (may take 30 seconds)"
echo "   3. Check MCP tools panel for effect-patterns server"
echo ""
echo "🔧 Expected tools: search_patterns, get_pattern, analyze_code, review_code, generate_pattern, list_rules"
