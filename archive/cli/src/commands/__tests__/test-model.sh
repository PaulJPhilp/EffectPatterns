#!/bin/bash

# Model Command Tests

log_info "Testing Model Command..."

# Test 1: Basic model list
run_test "Model list basic" \
    "$CLI_CMD model list" \
    "Available models"

# Test 2: Model info
run_test "Model info" \
    "$CLI_CMD model info gpt-4" \
    "gpt-4"

# Test 3: Model capabilities
run_test "Model capabilities" \
    "$CLI_CMD model capabilities" \
    "capabilities"

# Test 4: Model pricing
run_test "Model pricing" \
    "$CLI_CMD model pricing" \
    "pricing"

# Test 5: Model JSON format
run_test "Model JSON format" \
    "$CLI_CMD model list --format json" \
    '"models":'

# Test 6: Model with output file
TEST_MODEL_FILE="$TEST_OUTPUT_DIR/model-test-output.txt"
run_test "Model output to file" \
    "$CLI_CMD model list --output $TEST_MODEL_FILE" \
    "Available models"

# Test 7: Model specific provider
run_test "Model provider" \
    "$CLI_CMD model list --provider openai" \
    "openai"

# Test 8: Model validation
run_test "Model validation" \
    "$CLI_CMD model info invalid-model" \
    "error"
