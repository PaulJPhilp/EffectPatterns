#!/bin/bash

# Process-Prompt Command Tests

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
    log_warn "Test prompt file not found: $TEST_PROMPT_FILE"
fi

# Test 3: Process-prompt with output format
if [[ -f "$TEST_PROMPT_FILE" ]]; then
    run_test "Process-prompt JSON output" \
        "$CLI_CMD process-prompt $TEST_PROMPT_FILE --output-format json" \
        "json"
else
    log_warn "Test prompt file not found: $TEST_PROMPT_FILE"
fi

# Test 4: Process-prompt with model
if [[ -f "$TEST_PROMPT_FILE" ]]; then
    run_test "Process-prompt with model" \
        "$CLI_CMD process-prompt $TEST_PROMPT_FILE --model gpt-4" \
        "gpt-4"
else
    log_warn "Test prompt file not found: $TEST_PROMPT_FILE"
fi

# Test 5: Process-prompt with output file
TEST_OUTPUT_PROMPT_FILE="$TEST_OUTPUT_DIR/process-prompt-test-output.txt"
if [[ -f "$TEST_PROMPT_FILE" ]]; then
    run_test "Process-prompt output to file" \
        "$CLI_CMD process-prompt $TEST_PROMPT_FILE --output $TEST_OUTPUT_PROMPT_FILE" \
        "Processing"
else
    log_warn "Test prompt file not found: $TEST_PROMPT_FILE"
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
        "$CLI_CMD process-prompt $TEST_PROMPT_FILE --output-format json --schema-prompt $TEST_SCHEMA_FILE" \
        "json"
else
    log_warn "Test files not found for schema test"
fi

# Test 7: Process-prompt validation (invalid file)
run_test "Process-prompt invalid file" \
    "$CLI_CMD process-prompt /nonexistent/file.mdx" \
    "error"

# Test 8: Process-prompt validation (missing schema with JSON format)
run_test "Process-prompt missing schema" \
    "$CLI_CMD process-prompt $TEST_PROMPT_FILE --output-format json" \
    "schema-prompt"
