#!/bin/bash

# CLI Test Setup Script
# This script sets up the test environment

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_ROOT="$(dirname "$(dirname "$(dirname "$SCRIPT_DIR")")")"

# Source common environment setup
source "$SCRIPT_DIR/env-setup.sh"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_info "Setting up CLI test environment..."

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    log_error "bun is not installed. Please install bun first."
    exit 1
fi

log_info "bun is available: $(bun --version)"

# Check if CLI dependencies are installed
if [[ ! -d "$CLI_ROOT/node_modules" ]]; then
    log_warn "CLI dependencies not found. Installing..."
    cd "$CLI_ROOT"
    bun install
fi

# Make all test scripts executable
log_info "Making test scripts executable..."
chmod +x "$SCRIPT_DIR"/*.sh

# Create test output directories
TEST_OUTPUT_DIR="$SCRIPT_DIR/test-output"
STRESS_OUTPUT_DIR="$TEST_OUTPUT_DIR/stress"

log_info "Creating test output directories..."
mkdir -p "$TEST_OUTPUT_DIR"
mkdir -p "$STRESS_OUTPUT_DIR"

# Create test data directory
TEST_DATA_DIR="$SCRIPT_DIR/test-data"
mkdir -p "$TEST_DATA_DIR"

# Create test prompt files for testing
log_info "Creating test prompt files..."

# Create a simple test prompt file
cat > "$TEST_DATA_DIR/test-prompt.mdx" << 'EOF'
---
title: "Test Prompt"
model: "gpt-4"
---

This is a test prompt for CLI testing.

## Instructions

Please provide a simple test response.
EOF

# Create a test schema file
cat > "$TEST_DATA_DIR/test-schema.mdx" << 'EOF'
---
title: "Test Schema"
---

```json
{
  "type": "object",
  "properties": {
    "response": {
      "type": "string",
      "description": "The test response"
    },
    "status": {
      "type": "string",
      "enum": ["success", "failure"]
    }
  },
  "required": ["response", "status"]
}
```
EOF

# Create a test configuration file
cat > "$TEST_DATA_DIR/test-config.json" << 'EOF'
{
  "test": {
    "api_key": "test-key",
    "model": "gpt-4",
    "timeout": 30000
  }
}
EOF

# Verify CLI command works
CLI_CMD="node --loader ts-node/esm $CLI_ROOT/main.ts"
log_info "Testing CLI command..."

# Load environment variables from .env file
if [ -f "$PROJECT_ROOT/.env" ]; then
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
fi

# Test CLI command with environment
if ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}" OPENAI_API_KEY="${OPENAI_API_KEY:-}" GOOGLE_AI_API_KEY="${GOOGLE_AI_API_KEY:-}" $CLI_CMD --help &> /dev/null; then
    log_info "CLI command is working correctly"
else
    log_error "CLI command failed. Please check the CLI setup."
    exit 1
fi

# Create a test summary file
cat > "$SCRIPT_DIR/test-summary.md" << 'EOF'
# CLI Test Summary

## Test Environment
- CLI Location: $(realpath "$CLI_ROOT")
- Test Scripts: $(realpath "$SCRIPT_DIR")
- Output Directory: $(realpath "$TEST_OUTPUT_DIR")
- Test Data: $(realpath "$TEST_DATA_DIR")

## Quick Commands
```bash
# Run all tests
./run-all-tests.sh

# Run individual tests
./test-health.sh
./test-dry-run.sh
./test-list.sh
./test-config.sh
./test-auth.sh
./test-model.sh
./test-trace.sh
./test-process-prompt.sh

# Run stress tests
./stress-test.sh
```

## Test Files
- test-prompt.mdx: Sample prompt for testing
- test-schema.mdx: Sample schema for structured output testing
- test-config.json: Sample configuration for testing

## Troubleshooting
- Check test-output/ directory for detailed logs
- Use --verbose flag for more detailed output
- Check individual test scripts for specific test cases
EOF

log_info "Test environment setup complete!"
log_info "Test files created in: $TEST_DATA_DIR"
log_info "Test output will be saved to: $TEST_OUTPUT_DIR"
log_info "Run './run-all-tests.sh' to start testing"
