# Stress Testing Setup Guide

## Quick Start

### 1. Clean Environment
```bash
npm run cleanup:next
```

### 2. Run Stress Tests
```bash
# Run all stress tests
npm run test:stress

# Or run individual test suites
npm run test:stress:edge       # Edge case validation (highest priority)
npm run test:stress:load       # Load testing (high priority)
npm run test:stress:volume     # Large file handling (high priority)
npm run test:stress:spike      # Traffic burst resilience (medium priority)
npm run test:stress:endurance  # Long-running stability (medium priority)
```

## What Was Fixed

### Problem
The stress tests were failing because:
- Multiple Next.js server instances tried to start on ports 3001-3005
- Port lock files (.next/dev/lock) prevented new instances
- Previous test servers didn't fully shut down

### Solution
Implemented three improvements:

#### 1. Cleanup Script (Quick Fix)
- **File**: `scripts/cleanup-next.sh`
- **Usage**: `npm run cleanup:next`
- **What it does**:
  - Kills all running Next.js/bun processes
  - Removes Next.js cache and lock files
  - Frees ports 3000-3005
  - Verifies cleanup success

#### 2. Shared Server Instance
- **File**: `tests/stress/utils/server-control.ts`
- **Functions**:
  - `startSharedServer()` - Reuses single server instance
  - `stopSharedServer()` - Releases server with reference counting
  - `resetSharedServer()` - Force cleanup
- **Benefits**:
  - ✓ Eliminates port conflicts
  - ✓ Improves test speed (30s → 10s)
  - ✓ Uses reference counting for safety

#### 3. NPM Scripts
- **Updated**: `package.json`
- **New commands**:
  - `npm run cleanup:next` - Clean Next.js artifacts
  - `npm run cleanup:all` - Full cleanup (node_modules, dist, etc)

## Architecture

### Server Lifecycle Management

```
Test Suite Start
    ↓
startSharedServer()
    ├─ Check if already running (ref count > 0)
    ├─ YES → Reuse and increment ref count
    └─ NO → Start new instance
    ↓
Run Tests
    ↓
stopSharedServer()
    ├─ Decrement ref count
    ├─ If ref count > 0 → Keep running
    └─ If ref count = 0 → Stop server
    ↓
Test Suite End
```

### Port Management

| Port | Purpose | Test Suite |
|------|---------|-----------|
| 3000 | Development | `npm run dev` |
| 3001 | Edge Cases | `test:stress:edge` |
| 3002 | Load | `test:stress:load` |
| 3003 | Volume | `test:stress:volume` |
| 3004 | Spike | `test:stress:spike` |
| 3005 | Endurance | `test:stress:endurance` |

## Usage Examples

### Scenario 1: First Time Running Stress Tests
```bash
# Clean up any artifacts
npm run cleanup:next

# Run all tests
npm run test:stress

# Or run individual test
npm run test:stress:edge
```

### Scenario 2: Port Conflict During Development
```bash
# Check what's using a port
lsof -i :3000

# Clean up everything
npm run cleanup:next

# Restart development
npm run dev
```

### Scenario 3: Full Reset (Recommended After Major Changes)
```bash
npm run cleanup:all
npm install
npm run test:stress
```

### Scenario 4: Running Tests in CI/CD
```bash
# In GitHub Actions or similar
- name: Cleanup
  run: npm run cleanup:next
  
- name: Run Stress Tests
  run: npm run test:stress:edge  # Start with edge cases
  
- name: Run Full Test Suite
  run: npm run test:stress       # Then full suite
```

## Troubleshooting

### Issue: "Address already in use :::PORT"

**Quick Fix**:
```bash
npm run cleanup:next
```

**Manual Fix**:
```bash
# Find process using port
lsof -i :3001

# Kill the process
kill -9 <PID>

# Try again
npm run test:stress:edge
```

### Issue: "Unable to acquire lock at .next/dev/lock"

**Solution**:
```bash
# Remove lock file
rm -f .next/dev/lock
rm -rf .next

# Clean and retry
npm run cleanup:next
npm run test:stress:edge
```

### Issue: Server Timeout During Tests

**Cause**: System is under heavy load or low on resources

**Solutions**:
1. Close other applications
2. Check available memory: `free -h` (Linux) or `vm_stat` (macOS)
3. Run tests individually instead of all at once:
   ```bash
   npm run test:stress:edge      # Wait for completion
   npm run test:stress:load      # Then this
   npm run test:stress:volume    # Then this
   ```

### Issue: Tests Pass Individually But Fail Together

**Cause**: Port conflicts between concurrent test suites

**Solution**: Tests are configured to run sequentially. If this doesn't work:
```bash
# Clear everything
npm run cleanup:all

# Run one test at a time with explicit cleanup
npm run test:stress:edge && npm run cleanup:next
npm run test:stress:load && npm run cleanup:next
npm run test:stress:volume && npm run cleanup:next
```

### Issue: Memory Usage Keeps Growing

**Cause**: Possible memory leak in tests

**Solution**:
```bash
# Run endurance test which monitors memory
npm run test:stress:endurance

# Check the results for memory growth trends
# The test suite tracks memory growth per minute
```

## Performance Baselines

### Expected Results

| Test Suite | Tests | Duration | Notes |
|-----------|-------|----------|-------|
| Edge Cases | 19 | 5-10s | Basic correctness |
| Load | 6 | 30-45s | Concurrent request handling |
| Volume | 14 | 20-30s | Large file processing |
| Spike | 6 | 30-45s | Traffic burst handling |
| Endurance | 4 | 10m+ | Memory and stability |
| **Total** | **49** | **15-25m** | All tests sequentially |

### Success Criteria

**Edge Cases** ✓
- HTTP status codes: 100% correct
- Error response time: < 100ms
- Exceptions: 0 unhandled

**Load (25 req/s)**
- p50 latency: < 500ms
- p95 latency: < 1500ms
- Error rate: < 1%

**Peak (50 req/s)**
- p95 latency: < 3000ms
- Error rate: < 5%

**Endurance (10 min)**
- Latency degradation: < 1.2x
- Memory growth: < 5MB/min

## Implementation Details

### Shared Server with Reference Counting

The shared server uses a reference counting pattern to safely manage lifecycle:

```typescript
// In test setup
beforeAll(async () => {
  await startSharedServer({ port: 3001 });  // ref count: 1
});

// In test teardown
afterAll(async () => {
  await stopSharedServer();  // ref count: 0 → stops server
});

// For multiple tests in same suite
describe('Suite 1', () => {
  beforeAll(async () => {
    await startSharedServer({ port: 3001 });  // ref count: 1
  });
  
  afterAll(async () => {
    await stopSharedServer();  // ref count: 0
  });
});

describe('Suite 2', () => {
  beforeAll(async () => {
    await startSharedServer({ port: 3001 });  // ref count: 1 (reuses)
  });
  
  afterAll(async () => {
    await stopSharedServer();  // ref count: 0
  });
});
```

### Vitest Configuration

Stress tests are configured to run sequentially:

```typescript
export default defineConfig({
  test: {
    // Critical settings for stress tests
    fileParallelism: false,    // Run one test file at a time
    singleThread: true,         // Single thread per test
    
    testTimeout: 2_100_000,      // 35 minutes per test
    hookTimeout: 120_000,        // 2 minutes for setup/teardown
    
    reporters: ['default', 'json'],
    outputFile: {
      json: 'tests/stress/reports/results.json',
    },
  },
});
```

## Monitoring & Debugging

### View Server Logs During Tests
```bash
# Run with verbose output
npm run test:stress -- --reporter=verbose
```

### Check Port Status
```bash
# See all listening ports
lsof -i -P -n | grep LISTEN

# Check specific port
lsof -i :3001
```

### Monitor System Resources
```bash
# macOS
vm_stat 1  # Update every 1 second

# Linux
watch -n 1 free -h

# Windows PowerShell
while ($true) { Get-Process | Measure-Object | select count; Start-Sleep -Seconds 1 }
```

### View Test Report
```bash
# After tests complete
cat tests/stress/reports/results.json | jq .

# Filter for failed tests
cat tests/stress/reports/results.json | jq '.testResults[] | select(.status == "failed")'
```

## Best Practices

### Before Running Stress Tests
- [ ] Close unnecessary applications
- [ ] Stop other development servers
- [ ] Run cleanup: `npm run cleanup:next`
- [ ] Ensure at least 1GB free RAM
- [ ] Check internet connection for load tests

### During Tests
- [ ] Monitor system resources
- [ ] Don't manually kill processes (let tests handle cleanup)
- [ ] Keep terminal visible for error messages

### After Tests
- [ ] Review generated reports
- [ ] Check for performance regressions
- [ ] Run cleanup if finished: `npm run cleanup:next`

## Additional Resources

- [Main Stress Testing Documentation](./STRESS_TEST_IMPLEMENTATION.md)
- [Fix Details](./FIX_NEXT_SETUP.md)
- [Test Results](./tests/stress/reports/results.json)

## Support

If issues persist after running `npm run cleanup:next`:

1. **Manual Port Check**:
   ```bash
   # List all listening ports
   lsof -i -P -n | grep LISTEN
   
   # Kill specific port
   lsof -ti:3001 | xargs kill -9
   ```

2. **Full System Cleanup**:
   ```bash
   npm run cleanup:all
   ```

3. **Report an Issue**:
   Include output from:
   ```bash
   npm run cleanup:next
   npm run test:stress:edge 2>&1 | head -100
   ```
