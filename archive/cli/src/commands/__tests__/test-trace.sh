#!/bin/bash

# Trace Command Tests

log_info "Testing Trace Command..."

# Test 1: Basic trace
run_test "Trace basic" \
    "$CLI_CMD trace" \
    "trace"

# Test 2: Trace with operation
run_test "Trace operation" \
    "$CLI_CMD trace --operation test-operation" \
    "test-operation"

# Test 3: Trace with tags
run_test "Trace tags" \
    "$CLI_CMD trace --tags test-tag" \
    "test-tag"

# Test 4: Trace JSON format
run_test "Trace JSON format" \
    "$CLI_CMD trace --format json" \
    '"operation":'

# Test 5: Trace with output file
TEST_TRACE_FILE="$TEST_OUTPUT_DIR/trace-test-output.txt"
run_test "Trace output to file" \
    "$CLI_CMD trace --output $TEST_TRACE_FILE" \
    "trace"

# Test 6: Trace with duration
run_test "Trace duration" \
    "$CLI_CMD trace --duration 1000" \
    "1000"

# Test 7: Trace with error
run_test "Trace error" \
    "$CLI_CMD trace --error test-error" \
    "test-error"

# Test 8: Trace validation
run_test "Trace validation" \
    "$CLI_CMD trace --invalid-flag" \
    "error"
