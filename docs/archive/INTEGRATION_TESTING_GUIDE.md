# Integration Testing Guide

## Overview

Phase 4 of the QA improvements adds **end-to-end integration tests** that run patterns in realistic scenarios with actual resources. These tests validate real-world behavior beyond unit tests.

## What's Tested

### 1. Streaming with Large Files 💾

**Test**: Process a 90MB+ file line-by-line

**Validates**:
- Constant memory usage (<100MB growth)
- File streaming vs loading into memory
- Throughput performance (MB/s)
- Real file I/O operations

**Success Criteria**:
```
✓ Processes 89.54MB file
✓ Uses only 0.84MB memory (constant!)
✓ Throughput: 127MB/s
✓ Duration: ~700ms
```

**What This Catches**:
- Memory leaks in streaming patterns
- Loading entire files into memory
- Inefficient I/O operations

---

### 2. Parallel vs Sequential Performance 🔀

**Test**: Run 5 tasks with 500ms delays

**Validates**:
- Actual parallel execution
- Timing improvements vs sequential
- Concurrency correctness
- Effect.all behavior

**Success Criteria**:
```
✓ Parallel: ~600ms (tasks overlap)
✓ Sequential: ~2500ms (tasks add up)
✓ Speedup: >4x faster
```

**What This Catches**:
- Sequential execution claiming to be parallel
- Missing concurrency options
- Timing discrepancies

---

### 3. Error Handling Under Stress 🚨

**Test**: Multiple error scenarios

**Validates**:
- Error recovery
- Error logging with tapError
- Multiple error handlers
- Success path correctness

**Success Criteria**:
```
✓ Simple error recovery
✓ Side-effect logging with tapError
✓ Multiple error handlers (catchTag, catchAll)
✓ Success path works correctly
```

**What This Catches**:
- Broken error handling
- Non-functional error recovery
- Side-effect issues in error handling

---

### 4. Resource Management 🗃️

**Test**: Resource acquisition and cleanup

**Validates**:
- Resources properly acquired
- Resources properly released
- No resource leaks
- Cleanup on error

**Success Criteria**:
```
✓ 5 resources acquired
✓ 5 resources released (all!)
✓ No leaks detected
✓ Cleanup works even with errors
```

**What This Catches**:
- Resource leaks
- Failed cleanup on error
- Improper resource management

---

## Usage

### Run Integration Tests

```bash
# Run integration tests only
bun run test:integration

# Run all tests (unit + behavioral + integration)
bun run test:all
```

### CI/CD Integration

```yaml
- name: Run Integration Tests
  run: bun run test:integration
  timeout-minutes: 5
```

### Test Output

```
🔬 Integration & E2E Testing
Testing patterns in realistic scenarios

Running integration tests...

1/4 Testing streaming with large files...
  ✓ Passed

2/4 Testing parallel vs sequential performance...
  ✓ Passed

3/4 Testing error handling under stress...
  ✓ Passed

4/4 Testing resource management...
  ✓ Passed

📊 Integration Test Results
════════════════════════════════════════════════════════════
Total:     4 tests
Passed:    4 tests

Test Details:
────────────────────────────────────────────────────────────

✓ stream-from-file (streaming)
  Processed 89.54MB file in 701ms (127.73MB/s) using 0.84MB memory
  Metrics: duration: 701.00, memoryDelta: 0.84, throughput: 127.73

✓ parallel-execution (parallel)
  Parallel: 607ms, Sequential: 2561ms (4.22x speedup)
  Metrics: duration: 607.00

✓ error-handling (error-handling)
  Passed 4/4 error handling tests
  Metrics: errorRate: 0.00

✓ resource-management (resource-management)
  Acquired 5 resources, released 5 resources

════════════════════════════════════════════════════════════

✨ All integration tests passed in 5487ms!
```

---

## Test Architecture

### File Structure

```
test-data/               # Created during tests
├── test-file-large.txt  # 90MB test file
├── streaming-test.ts    # Generated test script
├── parallel-test.ts     # Generated test script
├── error-test.ts        # Generated test script
└── resource-test.ts     # Generated test script
```

### Test Flow

```
1. Setup
   ↓
   Create test data (files, scripts)
   
2. Execute
   ↓
   Run test scripts with monitoring
   ↓
   Collect metrics (memory, timing, etc.)
   
3. Validate
   ↓
   Check metrics against thresholds
   ↓
   Report pass/fail with details
   
4. Cleanup
   ↓
   Remove test data
   ↓
   Done
```

---

## Metrics Collected

### Streaming Test
- **File size**: Size of test file (MB)
- **Duration**: Processing time (ms)
- **Memory delta**: Memory growth during processing (MB)
- **Throughput**: Processing speed (MB/s)

**Thresholds**:
- Memory delta < 100MB
- Throughput > 50MB/s

### Parallel Test
- **Parallel time**: Time with concurrent execution (ms)
- **Sequential time**: Time with sequential execution (ms)
- **Speedup**: Sequential / Parallel ratio

**Thresholds**:
- Speedup > 2x
- Parallel time < 800ms (for 5 x 500ms tasks)

### Error Handling Test
- **Total tests**: Number of error scenarios
- **Passed tests**: Number that passed
- **Error rate**: Failed / Total

**Thresholds**:
- Error rate = 0 (all must pass)

### Resource Management Test
- **Acquired**: Number of resources acquired
- **Released**: Number of resources released

**Thresholds**:
- Acquired === Released (no leaks)

---

## Adding New Tests

### 1. Create Test Function

```typescript
async function testMyPattern(): Promise<IntegrationTestResult> {
  const pattern = "my-pattern"
  const issues: string[] = []
  
  try {
    // 1. Setup test environment
    const testFile = await createTestData()
    
    // 2. Create test script
    const testScript = `
      import { Effect } from "effect"
      
      const program = Effect.gen(function* () {
        // Your test logic here
        console.log(JSON.stringify({ result: "success" }))
      })
      
      Effect.runPromise(program)
    `
    
    // 3. Run test with monitoring
    const scriptPath = path.join(TEST_DATA_DIR, "my-test.ts")
    await fs.writeFile(scriptPath, testScript)
    
    const result = await execAsync(`bun run ${scriptPath}`)
    const output = JSON.parse(result.stdout.trim())
    
    // 4. Validate results
    if (output.result !== "success") {
      issues.push("Test failed")
    }
    
    return {
      pattern,
      testType: "my-category",
      passed: issues.length === 0,
      metrics: {},
      issues,
      details: "Test description",
    }
  } catch (error: any) {
    return {
      pattern,
      testType: "my-category",
      passed: false,
      metrics: {},
      issues: [`Test failed: ${error.message}`],
      details: error.message,
    }
  }
}
```

### 2. Add to Test Suite

```typescript
async function runIntegrationTests(): Promise<IntegrationTestResult[]> {
  const results: IntegrationTestResult[] = []
  
  // ... existing tests
  
  // Your new test
  console.log("5/5 Testing my pattern...")
  const myResult = await testMyPattern()
  results.push(myResult)
  console.log(myResult.passed ? "  ✓ Passed" : "  ✗ Failed")
  
  return results
}
```

---

## Comparison: All 4 Phases

| Phase | What It Tests | Speed | Coverage | Type |
|-------|--------------|-------|----------|------|
| **1: Behavioral** | Memory, timing | ~1s | Runtime behavior | Automated |
| **2: Linter** | Idioms, APIs | ~30ms | Syntax patterns | Automated |
| **3: LLM QA** | Semantics | ~5-10s | Code + docs | Automated |
| **4: Integration** | Real scenarios | ~5s | End-to-end | Automated |

### Combined Coverage

```
┌────────────────────────────────────────┐
│  Phase 1: Behavioral Tests             │
│  • Memory profiling                    │
│  • Timing validation                   │
│  • Pattern verification                │
└────────────────────────────────────────┘
                  ↓
┌────────────────────────────────────────┐
│  Phase 2: Pattern Linter               │
│  • Effect idioms                       │
│  • Deprecated APIs                     │
│  • Concurrency checks                  │
└────────────────────────────────────────┘
                  ↓
┌────────────────────────────────────────┐
│  Phase 3: LLM Semantic QA              │
│  • Memory behavior                     │
│  • Concurrency claims                  │
│  • API modernization                   │
└────────────────────────────────────────┘
                  ↓
┌────────────────────────────────────────┐
│  Phase 4: Integration Tests            │
│  • Real file operations                │
│  • Actual parallelism                  │
│  • Error handling in practice          │
│  • Resource cleanup                    │
└────────────────────────────────────────┘
```

**Result**: 4-layer defense catching bugs from syntax → semantics → runtime → integration!

---

## Performance

- **Total time**: ~5-6 seconds
- **Test parallelism**: 3 concurrent tests
- **Memory usage**: Low (tests are isolated)
- **File I/O**: Temporary files cleaned up

---

## Troubleshooting

### Test Timeout

**Issue**: Test exceeds timeout (60s)

**Solution**: 
- Check for infinite loops
- Verify file sizes aren't too large
- Ensure proper cleanup

### Memory Threshold

**Issue**: Streaming test fails memory check

**Solution**:
- Verify actual streaming (not loading)
- Check for buffer accumulation
- Profile memory usage

### Parallel Speedup

**Issue**: Parallel test doesn't show speedup

**Solution**:
- Check concurrency option
- Verify tasks actually run in parallel
- Adjust delay times if needed

---

## Future Enhancements

Planned additions:

1. **Network Tests** - HTTP requests, retries, timeouts
2. **Database Tests** - Connection pooling, transactions
3. **Performance Benchmarks** - Throughput, latency
4. **Load Tests** - High concurrency scenarios
5. **Edge Case Tests** - Boundary conditions, error paths

---

## Related

- [QA_GAP_ANALYSIS.md](./QA_GAP_ANALYSIS.md) - Why we need integration tests
- [test-behavioral.ts](./scripts/publish/test-behavioral.ts) - Phase 1
- [lint-effect-patterns.ts](./scripts/publish/lint-effect-patterns.ts) - Phase 2
- [qa-schema-enhanced.mdx](./scripts/qa/prompts/qa-schema-enhanced.mdx) - Phase 3

