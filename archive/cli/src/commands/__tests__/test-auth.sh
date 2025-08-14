#!/bin/bash

# Auth Command Tests

log_info "Testing Auth Command..."

# Test 1: Basic auth status
run_test "Auth status" \
    "$CLI_CMD auth status" \
    "Authentication"

# Test 2: Auth login
run_test "Auth login" \
    "$CLI_CMD auth login --provider test" \
    "login"

# Test 3: Auth logout
run_test "Auth logout" \
    "$CLI_CMD auth logout" \
    "logout"

# Test 4: Auth providers
run_test "Auth providers" \
    "$CLI_CMD auth providers" \
    "providers"

# Test 5: Auth tokens
run_test "Auth tokens" \
    "$CLI_CMD auth tokens" \
    "tokens"

# Test 6: Auth JSON format
run_test "Auth JSON format" \
    "$CLI_CMD auth status --format json" \
    '"status":'

# Test 7: Auth with output file
TEST_AUTH_FILE="$TEST_OUTPUT_DIR/auth-test-output.txt"
run_test "Auth output to file" \
    "$CLI_CMD auth status --output $TEST_AUTH_FILE" \
    "Authentication"

# Test 8: Auth validation
run_test "Auth validation" \
    "$CLI_CMD auth login --invalid-flag" \
    "error"
