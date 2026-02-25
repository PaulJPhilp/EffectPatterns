#!/bin/bash
# Pre-built MCP server - no rebuild, direct execution
# Pass through environment variables for API key and configuration
export NODE_ENV="${NODE_ENV:-development}"
export EFFECT_PATTERNS_API_URL="${EFFECT_PATTERNS_API_URL:-http://localhost:3000}"
export MCP_ENV="${MCP_ENV:-local}"

# Support both PATTERN_API_KEY and LOCAL_API_KEY for local development
if [ -z "$PATTERN_API_KEY" ] && [ -n "$LOCAL_API_KEY" ]; then
  export PATTERN_API_KEY="$LOCAL_API_KEY"
fi

# Default to dev-key if no API key is provided (for local development)
if [ -z "$PATTERN_API_KEY" ]; then
  export PATTERN_API_KEY="dev-key"
fi

exec node "$(dirname "$0")/dist/mcp-stdio.js"
