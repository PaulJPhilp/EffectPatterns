#!/bin/bash

# CLI Command Test Suite
# This script runs comprehensive tests for all CLI commands

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_ROOT="$(dirname "$TEST_DIR")"
PROJECT_ROOT="$(dirname "$(dirname "$CLI_ROOT")")"
CLI_CMD="node --loader ts-node/esm $CLI_ROOT/main.ts"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_test() {
    echo -e "${GREEN}[TEST]${NC} $1"
}

# Helper function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    
    log_test "Running: $test_name"
    
    if eval "$test_command" 2>/dev/null | grep -q "$expected_pattern"; then
        log_info "✓ $test_name PASSED"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        log_error "✗ $test_name FAILED"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Helper function to run a test with exact output match
run_test_exact() {
    local test_name="$1"
    local test_command="$2"
    local expected_output="$3"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    
    log_test "Running: $test_name"
    
    actual_output=$(eval "$test_command" 2>/dev/null)
    if [[ "$actual_output" == "$expected_output" ]]; then
        log_info "✓ $test_name PASSED"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        log_error "✗ $test_name FAILED"
        echo "Expected: $expected_output"
        echo "Actual: $actual_output"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Create test output directory
TEST_OUTPUT_DIR="$TEST_DIR/test-output"
mkdir -p "$TEST_OUTPUT_DIR"

log_info "Starting CLI Command Test Suite"
log_info "Test directory: $TEST_DIR"
log_info "CLI command: $CLI_CMD"

# Run individual test scripts
source "$TEST_DIR/test-health.sh"
source "$TEST_DIR/test-dry-run.sh"
source "$TEST_DIR/test-list.sh"
source "$TEST_DIR/test-config.sh"
source "$TEST_DIR/test-auth.sh"
source "$TEST_DIR/test-model.sh"
source "$TEST_DIR/test-trace.sh"
source "$TEST_DIR/test-process-prompt.sh"

# Summary
log_info "Test Suite Complete"
log_info "Tests Run: $TESTS_RUN"
log_info "Tests Passed: $TESTS_PASSED"
log_info "Tests Failed: $TESTS_FAILED"

if [[ $TESTS_FAILED -gt 0 ]]; then
    log_error "Some tests failed!"
    exit 1
else
    log_info "All tests passed!"
    exit 0
fi
