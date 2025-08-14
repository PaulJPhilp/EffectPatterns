#!/bin/bash

# Dry-Run Command Tests

log_info "Testing Dry-Run Command..."

# Test 1: Basic dry-run
run_test "Dry-run basic" \
    "$CLI_CMD dry-run" \
    "dry-run"

# Test 2: Dry-run with prompt
run_test "Dry-run with prompt" \
    "$CLI_CMD dry-run --prompt 'test prompt'" \
    "test prompt"

# Test 3: Dry-run with model
run_test "Dry-run with model" \
    "$CLI_CMD dry-run --model gpt-4" \
    "gpt-4"

# Test 4: Dry-run with temperature
run_test "Dry-run with temperature" \
    "$CLI_CMD dry-run --temperature 0.7" \
    "0.7"

# Test 5: Dry-run with max-tokens
run_test "Dry-run with max-tokens" \
    "$CLI_CMD dry-run --max-tokens 100" \
    "100"

# Test 6: Dry-run JSON output
run_test "Dry-run JSON output" \
    "$CLI_CMD dry-run --format json" \
    '"model":'

# Test 7: Dry-run with output file
TEST_DRYRUN_FILE="$TEST_OUTPUT_DIR/dryrun-test-output.txt"
run_test "Dry-run output to file" \
    "$CLI_CMD dry-run --output $TEST_DRYRUN_FILE" \
    "dry-run"

# Test 8: Dry-run with all options
run_test "Dry-run all options" \
    "$CLI_CMD dry-run --prompt 'test' --model gpt-4 --temperature 0.5 --max-tokens 50" \
    "test"
