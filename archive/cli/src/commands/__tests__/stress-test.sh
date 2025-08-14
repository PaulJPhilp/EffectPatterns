#!/bin/bash

# CLI Stress Test Suite
# This script performs stress testing on CLI commands

set -e

log_info "Starting CLI Stress Tests..."

# Stress test configuration
STRESS_ITERATIONS=10
PARALLEL_JOBS=3

# Create stress test output directory
STRESS_OUTPUT_DIR="$TEST_OUTPUT_DIR/stress"
mkdir -p "$STRESS_OUTPUT_DIR"

# Function to run parallel stress tests
run_stress_test() {
    local test_name="$1"
    local command_template="$2"
    local iterations="$3"
    
    log_info "Stress testing: $test_name ($iterations iterations)"
    
    local start_time=$(date +%s)
    local success_count=0
    local failure_count=0
    
    for ((i=1; i<=iterations; i++)); do
        local output_file="$STRESS_OUTPUT_DIR/${test_name}-${i}.log"
        
        if eval "${command_template//ITERATION/$i}" > "$output_file" 2>&1; then
            success_count=$((success_count + 1))
        else
            failure_count=$((failure_count + 1))
            log_error "Stress test $test_name iteration $i failed"
        fi
    done
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_info "Stress test $test_name completed: $success_count success, $failure_count failures, ${duration}s"
    
    if [[ $failure_count -eq 0 ]]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Stress test health command
run_stress_test "health-stress" \
    "$CLI_CMD health --quiet" \
    "$STRESS_ITERATIONS"

# Stress test list command
run_stress_test "list-stress" \
    "$CLI_CMD list --quiet" \
    "$STRESS_ITERATIONS"

# Stress test model command
run_stress_test "model-stress" \
    "$CLI_CMD model list --quiet" \
    "$STRESS_ITERATIONS"

# Stress test config command
run_stress_test "config-stress" \
    "$CLI_CMD config list --quiet" \
    "$STRESS_ITERATIONS"

# Parallel stress test
log_info "Running parallel stress tests..."

# Run multiple commands in parallel
for ((i=1; i<=PARALLEL_JOBS; i++)); do
    {
        for ((j=1; j<=3; j++)); do
            $CLI_CMD health --quiet > "$STRESS_OUTPUT_DIR/parallel-health-${i}-${j}.log" 2>&1
            $CLI_CMD list --quiet > "$STRESS_OUTPUT_DIR/parallel-list-${i}-${j}.log" 2>&1
            $CLI_CMD model list --quiet > "$STRESS_OUTPUT_DIR/parallel-model-${i}-${j}.log" 2>&1
        done
    } &
done

# Wait for all parallel jobs to complete
wait

log_info "Parallel stress tests completed"

# Memory usage test
log_info "Testing memory usage..."
for ((i=1; i<=5; i++)); do
    $CLI_CMD health --verbose > "$STRESS_OUTPUT_DIR/memory-test-${i}.log" 2>&1 &
done

wait

log_info "Memory usage tests completed"
