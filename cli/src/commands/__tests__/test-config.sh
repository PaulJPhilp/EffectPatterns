#!/bin/bash

# Config Command Tests

log_info "Testing Config Command..."

# Test 1: Basic config
run_test "Config basic" \
    "$CLI_CMD config" \
    "Configuration"

# Test 2: Config set
run_test "Config set" \
    "$CLI_CMD config set test.key test-value" \
    "test.key"

# Test 3: Config get
run_test "Config get" \
    "$CLI_CMD config get test.key" \
    "test-value"

# Test 4: Config list
run_test "Config list" \
    "$CLI_CMD config list" \
    "test.key"

# Test 5: Config delete
run_test "Config delete" \
    "$CLI_CMD config delete test.key" \
    "deleted"

# Test 6: Config JSON format
run_test "Config JSON format" \
    "$CLI_CMD config list --format json" \
    '"test.key":'

# Test 7: Config with output file
TEST_CONFIG_FILE="$TEST_OUTPUT_DIR/config-test-output.txt"
run_test "Config output to file" \
    "$CLI_CMD config list --output $TEST_CONFIG_FILE" \
    "test.key"

# Test 8: Config validation
run_test "Config validation" \
    "$CLI_CMD config set invalid-key" \
    "error"
