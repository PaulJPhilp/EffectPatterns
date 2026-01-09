#!/bin/bash

# test-single-pattern.sh
#
# Test script to validate the qa-process.sh script with a single pattern

set -e  # Exit on any error

# --- CONFIGURATION ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
TEST_PATTERN_DIR="$PROJECT_ROOT/content/new/processed"

# --- CREATE TEST PATTERN ---
create_test_pattern() {
  local test_pattern_file="$TEST_PATTERN_DIR/test-pattern.mdx"
  
  cat > "$test_pattern_file" << 'EOF'
---
title: "Test Pattern"
id: "test-pattern"
skillLevel: "Beginner"
useCase:
  - "Testing"
tags:
  - "test"
  - "example"
description: "A test pattern for validation"
---

# Test Pattern

This is a test pattern to validate the QA process script.

## Good Example

```ts
import { Effect } from "effect"

const program = Effect.succeed("Hello, World!")

Effect.runPromise(program).then(console.log)
```
EOF
  
  echo "Created test pattern: $test_pattern_file"
}

# --- CLEANUP ---
cleanup() {
  local test_pattern_file="$TEST_PATTERN_DIR/test-pattern.mdx"
  local test_result_file="$PROJECT_ROOT/content/qa/results/test-pattern-qa.json"
  
  if [ -f "$test_pattern_file" ]; then
    rm -f "$test_pattern_file"
    echo "Removed test pattern: $test_pattern_file"
  fi
  
  if [ -f "$test_result_file" ]; then
    rm -f "$test_result_file"
    echo "Removed test result: $test_result_file"
  fi
}

# --- MAIN ---
main() {
  echo "Testing qa-process.sh with a single pattern..."
  
  # Set up trap for cleanup
  trap cleanup EXIT
  
  # Create test pattern
  create_test_pattern
  
  # Run the QA process script on the single pattern
  echo "Running QA process on test pattern..."
  
  # Change to project root directory
  cd "$PROJECT_ROOT"
  
  # Run the script
  if ./scripts/qa/qa-process.sh; then
    echo "✓ QA process completed successfully"
  else
    echo "✗ QA process failed"
    exit 1
  fi
  
  # Check if result file was created
  local result_file="$PROJECT_ROOT/content/qa/results/test-pattern-qa.json"
  if [ -f "$result_file" ]; then
    echo "✓ Result file created: $result_file"
    echo "Result file contents:"
    cat "$result_file"
  else
    echo "✗ Result file not found: $result_file"
    exit 1
  fi
  
  echo "All tests passed!"
}

main "$@"
