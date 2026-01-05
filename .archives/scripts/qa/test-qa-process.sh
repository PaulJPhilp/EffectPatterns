#!/bin/bash

# test-qa-process.sh
#
# Test script for qa-process.sh

set -e  # Exit on any error

# --- CONFIGURATION ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- TEST ---
echo "Testing qa-process.sh script..."

# Check if the main script exists
if [ ! -f "$SCRIPT_DIR/qa-process.sh" ]; then
  echo "ERROR: qa-process.sh not found!"
  exit 1
fi

echo "✓ qa-process.sh exists"

# Check if the script is executable
if [ ! -x "$SCRIPT_DIR/qa-process.sh" ]; then
  echo "ERROR: qa-process.sh is not executable!"
  exit 1
fi

echo "✓ qa-process.sh is executable"

# Check syntax
if ! bash -n "$SCRIPT_DIR/qa-process.sh"; then
  echo "ERROR: qa-process.sh has syntax errors!"
  exit 1
fi

echo "✓ qa-process.sh has valid syntax"

echo "All tests passed!"
