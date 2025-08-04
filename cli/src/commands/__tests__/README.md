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

## Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed
- `2` - Test setup failed
