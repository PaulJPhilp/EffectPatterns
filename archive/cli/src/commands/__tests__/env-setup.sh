#!/bin/bash
# Environment setup for CLI tests

# Ensure we're in the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
CLI_ROOT="$PROJECT_ROOT/cli"

# Load environment variables from .env file
if [ -f "$PROJECT_ROOT/.env" ]; then
    # Export all variables from .env file
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
fi

# Ensure required environment variables are set
export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"
export OPENAI_API_KEY="${OPENAI_API_KEY:-}"
export GOOGLE_AI_API_KEY="${GOOGLE_AI_API_KEY:-}"

# CLI command with proper environment
CLI_CMD="cd $CLI_ROOT && node --loader ts-node/esm src/main.ts"

# Helper function to check if API keys are available
check_api_keys() {
    local missing_keys=()
    
    if [ -z "$ANTHROPIC_API_KEY" ]; then
        missing_keys+=("ANTHROPIC_API_KEY")
    fi
    
    if [ -z "$OPENAI_API_KEY" ]; then
        missing_keys+=("OPENAI_API_KEY")
    fi
    
    if [ -z "$GOOGLE_AI_API_KEY" ]; then
        missing_keys+=("GOOGLE_AI_API_KEY")
    fi
    
    if [ ${#missing_keys[@]} -gt 0 ]; then
        echo "Warning: Missing API keys: ${missing_keys[*]}"
        return 1
    fi
    
    return 0
}
