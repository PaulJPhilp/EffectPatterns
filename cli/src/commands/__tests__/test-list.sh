#!/bin/bash

# List Command Tests

log_info "Testing List Command..."

# Test 1: Basic list
run_test "List basic" \
    "$CLI_CMD list" \
    "Available commands"

# Test 2: List with verbose
run_test "List verbose" \
    "$CLI_CMD list --verbose" \
    "verbose"

# Test 3: List with quiet
run_test "List quiet" \
    "$CLI_CMD list --quiet" \
    ""

# Test 4: List JSON format
run_test "List JSON format" \
    "$CLI_CMD list --format json" \
    '"commands":'

# Test 5: List with output file
TEST_LIST_FILE="$TEST_OUTPUT_DIR/list-test-output.txt"
run_test "List output to file" \
    "$CLI_CMD list --output $TEST_LIST_FILE" \
    "Available commands"

# Test 6: List with force flag
run_test "List force overwrite" \
    "$CLI_CMD list --output $TEST_LIST_FILE --force" \
    "Available commands"

# Test 7: List with specific pattern
run_test "List pattern" \
    "$CLI_CMD list --pattern health" \
    "health"
