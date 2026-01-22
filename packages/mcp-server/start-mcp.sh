#!/bin/bash
# Pre-built MCP server - no rebuild, direct execution
export NODE_ENV=development
export EFFECT_PATTERNS_API_URL=http://localhost:3000
exec node "$(dirname "$0")/dist/mcp-stdio.js"
