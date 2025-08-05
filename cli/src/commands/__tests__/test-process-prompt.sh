#!/bin/bash

# Process-Prompt Command Tests

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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

# CLI command
CLI_CMD="cd $CLI_ROOT && node --loader ts-node/esm src/main.ts"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Helper function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    
    echo -n "Testing $test_name... "
    
    # Export environment variables explicitly before running each test
    export ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"
    export OPENAI_API_KEY="$OPENAI_API_KEY"
    export GOOGLE_AI_API_KEY="$GOOGLE_AI_API_KEY"
    
    # Run the command and capture output
    output=$(bash -c "$test_command" 2>&1)
    exit_code=$?
    
    if [[ $exit_code -eq 0 ]]; then
        if [[ -z "$expected_pattern" ]] || echo "$output" | grep -q "$expected_pattern"; then
            log_success "PASSED"
            TESTS_PASSED=$((TESTS_PASSED + 1))
            return 0
        else
            echo -e "${RED}FAILED${NC} (pattern not found)"
            echo "Expected: $expected_pattern"
            echo "Output: $output"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            return 1
        fi
    else
        echo -e "${RED}FAILED${NC} (exit code: $exit_code)"
        echo "Output: $output"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Create test output directory
TEST_OUTPUT_DIR="$SCRIPT_DIR/test-output"
mkdir -p "$TEST_OUTPUT_DIR"

# Test 2: Process-prompt with file (using existing test file)
TEST_PROMPT_FILE="$PROJECT_ROOT/content/new/processed/observability-opentelemetry.mdx"

log_info "Testing Process-Prompt Command..."

# Test 1: Basic process-prompt help
run_test "Process-prompt help" \
    "$CLI_CMD process-prompt --help" \
    "process-prompt"

# Test 2: Process-prompt with file (using existing test file)
TEST_PROMPT_FILE="$PROJECT_ROOT/content/new/processed/observability-opentelemetry.mdx"
if [[ -f "$TEST_PROMPT_FILE" ]]; then
    run_test "Process-prompt with file" \
        "$CLI_CMD process-prompt $TEST_PROMPT_FILE" \
        "Processing"
else
    log_info "Test prompt file not found: $TEST_PROMPT_FILE"
fi

# Test 3: Process-prompt with output format
if [[ -f "$TEST_PROMPT_FILE" ]]; then
    run_test "Process-prompt JSON output" \
        "OUTPUT_FORMAT=json $CLI_CMD process-prompt $TEST_PROMPT_FILE" \
        "json"
else
    log_info "Test prompt file not found: $TEST_PROMPT_FILE"
fi

# Test 4: Process-prompt with model
if [[ -f "$TEST_PROMPT_FILE" ]]; then
    run_test "Process-prompt with model" \
        "$CLI_CMD process-prompt $TEST_PROMPT_FILE --model \"gemini-2.0-flash\"" \
        "gemini-2.0-flash"
else
    log_info "Test prompt file not found: $TEST_PROMPT_FILE"
fi

# Test 5: Process-prompt with output file
TEST_OUTPUT_PROMPT_FILE="$TEST_OUTPUT_DIR/process-prompt-test-output.txt"
if [[ -f "$TEST_PROMPT_FILE" ]]; then
    run_test "Process-prompt output to file" \
        "$CLI_CMD process-prompt $TEST_PROMPT_FILE --output \"$TEST_OUTPUT_PROMPT_FILE\"" \
        "Output saved to"
else
    log_info "Test prompt file not found: $TEST_PROMPT_FILE"
fi

# Test 6: Process-prompt with schema
TEST_SCHEMA_FILE="$TEST_OUTPUT_DIR/test-schema.mdx"
cat > "$TEST_SCHEMA_FILE" << 'EOF'
---
title: "Test Schema"
---
```json
{
  "type": "object",
  "properties": {
    "response": {"type": "string"}
  }
}
```
EOF

if [[ -f "$TEST_PROMPT_FILE" ]] && [[ -f "$TEST_SCHEMA_FILE" ]]; then
    run_test "Process-prompt with schema" \
        "OUTPUT_FORMAT=json SCHEMA_PROMPT=$TEST_SCHEMA_FILE $CLI_CMD process-prompt $TEST_PROMPT_FILE" \
        "json"
else
    log_info "Test files not found for schema test"
fi

# Test 7: Process-prompt validation (invalid file)
run_test "Process-prompt invalid file" \
    "$CLI_CMD process-prompt /nonexistent/file.mdx" \
    "error"

# Test 8: Process-prompt validation (missing schema with JSON format)
run_test "Process-prompt missing schema" \
    "OUTPUT_FORMAT=json $CLI_CMD process-prompt $TEST_PROMPT_FILE" \
    "schema-prompt"

# Test 9: Process-prompt with Google models
if [[ -f "$TEST_PROMPT_FILE" ]]; then
    run_test "Process-prompt with Google gemini-2.5-pro" \
        "$CLI_CMD process-prompt $TEST_PROMPT_FILE --provider google --model gemini-2.5-pro" \
        "gemini-2.5-pro"
    
    run_test "Process-prompt with Google gemini-2.5-flash" \
        "$CLI_CMD process-prompt $TEST_PROMPT_FILE --provider google --model gemini-2.5-flash" \
        "gemini-2.5-flash"
else
    log_info "Test prompt file not found: $TEST_PROMPT_FILE"
fi

# Test 10: Process-prompt with OpenAI models
if [[ -f "$TEST_PROMPT_FILE" ]]; then
    run_test "Process-prompt with OpenAI gpt-4o" \
        "$CLI_CMD process-prompt $TEST_PROMPT_FILE --provider openai --model gpt-4o" \
        "gpt-4o"
    
    run_test "Process-prompt with OpenAI gpt-4o-mini" \
        "$CLI_CMD process-prompt $TEST_PROMPT_FILE --provider openai --model gpt-4o-mini" \
        "gpt-4o-mini"
else
    log_info "Test prompt file not found: $TEST_PROMPT_FILE"
fi

# Test 11: Process-prompt with Anthropic models
if [[ -f "$TEST_PROMPT_FILE" ]]; then
    run_test "Process-prompt with Anthropic claude-4" \
        "$CLI_CMD process-prompt $TEST_PROMPT_FILE --provider anthropic --model claude-4" \
        "claude-4"
    
    run_test "Process-prompt with Anthropic claude-3-5-sonnet" \
        "$CLI_CMD process-prompt $TEST_PROMPT_FILE --provider anthropic --model claude-3-5-sonnet" \
        "claude-3-5-sonnet"
else
    log_info "Test prompt file not found: $TEST_PROMPT_FILE"
fi

# Summary
echo ""
echo "Process-Prompt Command Tests Complete"
echo "Tests Run: $TESTS_RUN"
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"

if [[ $TESTS_FAILED -gt 0 ]]; then
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
else
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
fi
