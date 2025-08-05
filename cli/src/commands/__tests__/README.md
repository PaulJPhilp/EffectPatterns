# CLI Command Test Suite

This directory contains shell-based tests for the CLI commands. These tests are designed to stress test the CLI functionality without using vitest.

## Test Structure

- `run-all-tests.sh` - Main test runner that orchestrates all tests
- `test-*.sh` - Individual command test scripts
- `stress-test.sh` - Performance and stress testing
- `README.md` - This documentation file

## Running Tests

### Prerequisites

1. Ensure the CLI is built and available
2. Ensure `bun` is installed and in PATH
3. Ensure CLI dependencies are installed

### Quick Start

```bash
# Make all scripts executable
chmod +x *.sh

# Run all tests
./run-all-tests.sh

# Run individual command tests
./test-health.sh
./test-dry-run.sh
./test-list.sh
./test-config.sh
./test-auth.sh
./test-model.sh
./test-trace.sh
./test-process-prompt.sh

# Run stress tests
./stress-test.sh
```

### Test Output

- Test results are displayed in the console with color coding
- All test output files are saved to `test-output/` directory
- Stress test logs are saved to `test-output/stress/` directory

## Test Coverage

### Health Command Tests
- Basic health check
- Verbose output
- Quiet output
- File output
- JSON format
- Custom timeout
- Error handling

### Dry-Run Command Tests
- Basic dry-run
- Prompt input
- Model selection
- Temperature setting
- Max tokens
- JSON format
- File output
- All options combined

### List Command Tests
- Basic list
- Verbose output
- Quiet output
- JSON format
- File output
- Force overwrite
- Pattern filtering

### Config Command Tests
- Basic config
- Set configuration
- Get configuration
- List configuration
- Delete configuration
- JSON format
- File output
- Validation

### Auth Command Tests
- Status check
- Login
- Logout
- Providers list
- Tokens management
- JSON format
- File output
- Validation

### Model Command Tests
- Model list
- Model info
- Capabilities
- Pricing
- JSON format
- File output
- Provider filtering
- Validation

### Trace Command Tests
- Basic trace
- Operation tracing
- Tags
- JSON format
- File output
- Duration
- Error handling
- Validation

### Process-Prompt Command Tests
- Help output
- File processing
- JSON output
- Model selection
- File output
- Schema usage
- Validation tests

## Stress Testing

The stress test suite includes:
- Multiple iterations of each command
- Parallel execution testing
- Memory usage monitoring
- Performance benchmarking
- Error rate tracking

## Debugging

- Check `test-output/` directory for detailed logs
- Use `--verbose` flag for more detailed output
- Check individual test scripts for specific test cases
- Use `set -x` in scripts for command tracing

## Adding New Tests

1. Create a new `test-*.sh` script following the existing pattern
2. Add the script to `run-all-tests.sh` source list
3. Ensure proper error handling and validation
4. Add appropriate test cases for new functionality
5. Update this README if needed

## Environment Variables

The tests use the following environment variables:
- `CLI_CMD` - The CLI command to run (automatically set)
- `TEST_OUTPUT_DIR` - Directory for test output files
- `STRESS_OUTPUT_DIR` - Directory for stress test output

## Shell Script Patterns

All shell-based test scripts follow a consistent pattern based on `test-health.sh`:

1. **Environment Setup**:
   - Set up color codes for output
   - Determine script and CLI root directories
   - Define the CLI command (`CLI_CMD`) with proper path
   - Initialize test counters

2. **Helper Functions**:
   - `log_info()`, `log_error()`, `log_success()` for colored output
   - `run_test()` function that executes commands and validates results

3. **Test Execution**:
   - Create test output directory
   - Run individual tests using `run_test` with descriptive names
   - Each test calls the CLI command with specific arguments
   - Tests validate both exit codes and output content

4. **Result Reporting**:
   - Display test results with pass/fail counts
   - Use appropriate exit codes (0 for success, 1 for failure)

Example pattern:
```bash
#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

# Run tests
run_test "Test description" "$CLI_CMD command --args" "expected_output_pattern"

# Summary
echo ""
echo "Test Suite Complete"
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
```

## Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed
- `2` - Test setup failed
