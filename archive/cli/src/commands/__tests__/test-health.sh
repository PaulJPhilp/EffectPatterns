#!/bin/bash

# Health Command Tests

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_ROOT="$(dirname "$(dirname "$(dirname "$SCRIPT_DIR")")")"

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
    
    # Run the command and capture output
    output=$(eval "$test_command" 2>&1)
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

log_info "Testing Health Command..."

# Test 1: Basic health check
run_test "Health command basic check" "$CLI_CMD health" "Health"

# Test 2: Health check with verbose output
run_test "Health verbose output" "$CLI_CMD health --verbose" "verbose"

# Test 3: Health check with quiet output
run_test "Health quiet output" "$CLI_CMD health --quiet" ""

# Test 4: Health check with output to file
TEST_HEALTH_FILE="$TEST_OUTPUT_DIR/health-test-output.txt"
run_test "Health output to file" "$CLI_CMD health --output $TEST_HEALTH_FILE" "Health"

# Test 5: Health check with force flag
run_test "Health force overwrite" "$CLI_CMD health --output $TEST_HEALTH_FILE --force" "Health"

# Test 6: Health check JSON format
run_test "Health JSON format" "$CLI_CMD health --format json" '"status":'

# Test 7: Health check with custom timeout
run_test "Health with timeout" "$CLI_CMD health --timeout 5000" "Health"

# Summary
echo ""
echo "Health Command Tests Complete"
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
