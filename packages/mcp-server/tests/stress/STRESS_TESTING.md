# Stress Testing Suite for review_code Tool

Comprehensive stress testing suite for validating performance, scalability, and error handling of the `review_code` MCP tool under various load conditions.

## Overview

This suite validates that the `review_code` tool meets performance requirements and handles edge cases gracefully. Tests are organized by priority and can be run individually or together.

### Test Categories

| Category | Priority | Purpose | Duration |
|----------|----------|---------|----------|
| **Edge Cases** | **HIGHEST** | Validates correctness and error handling | ~5 min |
| **Load** | **HIGH** | Tests concurrent request handling | ~5 min |
| **Volume** | **HIGH** | Tests large and complex file handling | ~3 min |
| **Spike** | Medium | Tests resilience to traffic bursts | ~10 min |
| **Endurance** | Medium | Tests long-running stability | 40+ min |

## Quick Start

### Run All Tests
```bash
bun run test:stress
```

### Run Specific Test Suite
```bash
bun run test:stress:edge      # Boundary values and error handling
bun run test:stress:load      # Concurrent requests
bun run test:stress:volume    # Large files
bun run test:stress:spike     # Traffic bursts
bun run test:stress:endurance # Long-running stability
```

### Run in Baseline Mode (Relaxed Thresholds)
```bash
STRESS_MODE=baseline bun run test:stress
```

## Test Descriptions

### Edge Cases Test (HIGHEST PRIORITY)

**Purpose**: Validates correctness before performance testing

**What It Tests**:
- ✓ Boundary values (empty file, 1 byte, exactly 100KB, 100KB+1)
- ✓ File type validation (.ts, .tsx, missing extension)
- ✓ Malformed code (invalid syntax, mismatched braces, unicode)
- ✓ Invalid requests (null code, wrong type, missing fields)
- ✓ Response format validation (JSON structure, recommendations array)
- ✓ Crash detection (server doesn't crash on edge inputs)

**Success Criteria**:
- 100% correct HTTP status codes (413 for oversized, 400 for invalid)
- Error response time < 100ms
- Zero unhandled exceptions
- Proper error messages in responses

**Run**:
```bash
bun run test:stress:edge
```

### Load Test (HIGH PRIORITY)

**Purpose**: Validates concurrent request handling and throughput

**What It Tests**:
- ✓ Baseline load (10 req/s for 30s with small files)
- ✓ Normal load (25 req/s for 60s with small files)
- ✓ Normal load with mixed file sizes (70% small, 20% medium, 10% large)
- ✓ Peak load (50 req/s for 60s)
- ✓ Saturation point (100 req/s to find limits)
- ✓ Sustained load (25 req/s for 2 minutes)

**Success Criteria (Normal Load 25 req/s)**:
- p50 latency < 500ms
- p95 latency < 1500ms
- p99 latency < 3000ms
- Error rate < 1%
- Throughput ≥ 20 req/s

**Success Criteria (Peak Load 50 req/s)**:
- p50 latency < 1000ms
- p95 latency < 3000ms
- p99 latency < 5000ms
- Error rate < 5%
- Throughput ≥ 15 req/s

**Run**:
```bash
bun run test:stress:load
```

### Volume Test (HIGH PRIORITY)

**Purpose**: Validates handling of large and complex files

**What It Tests**:
- ✓ Clean 98KB file (near size limit)
- ✓ 98KB file with many anti-patterns (50+ issues)
- ✓ 98KB file with deep nesting
- ✓ Files with maximum anti-patterns
- ✓ Mixed anti-patterns
- ✓ Size variations (5KB, 25KB, 90KB, 98KB)
- ✓ Deep nesting (10+ levels)
- ✓ Consistency (same input → same output)
- ✓ Response quality (severity levels, sorting)

**Success Criteria**:
- 98KB files: total time < 5s
- Maximum complexity: total time < 10s
- Memory peak < 200MB (near-limit), < 300MB (max)
- Recommendations limited to 3 items
- Consistent results for same input

**Run**:
```bash
bun run test:stress:volume
```

### Spike Test (MEDIUM PRIORITY)

**Purpose**: Tests resilience to sudden traffic bursts

**What It Tests**:
- ✓ Gradual ramp (0 → 100 req/s over 60s)
- ✓ Sudden spike (0 → 100 req/s in 5s, sustain 30s, drop)
- ✓ Recovery after spike (returns to baseline latency)
- ✓ Oscillating load (10 ↔ 80 req/s every 30s)
- ✓ Flash crowd (200 simultaneous requests)
- ✓ Wave pattern (smooth load curve)

**Success Criteria**:
- Max latency degradation: 3x normal
- Recovery time after spike: < 5s
- Error rate during spike: < 10%
- Timeout rate during spike: < 5%

**Run**:
```bash
bun run test:stress:spike
```

### Endurance Test (MEDIUM PRIORITY)

**Purpose**: Tests long-running stability and detects memory leaks

**What It Tests**:
- ✓ Sustained load for 10 minutes (10 req/s)
- ✓ Same file repeated 30 minutes (memory leak detection)
- ✓ High GC pressure (20 req/s for 5 minutes)
- ✓ Mixed workload for 10 minutes (varied file sizes)

**Success Criteria**:
- 10-minute sustained: latency degradation < 1.2x (20%)
- Memory growth < 5MB/min
- GC pause duration < 100ms
- Event loop lag < 50ms
- Success rate > 95%

**Run**:
```bash
bun run test:stress:endurance
```

## Interpreting Results

### Latency Percentiles

- **p50 (median)**: 50% of requests complete within this time
  - Normal for small files: 300-500ms
  - Target: Keep stable under load

- **p95**: 95% of requests complete within this time
  - Most important metric for user experience
  - Large files can cause p95 to spike
  - Target: < 1.5s for normal load

- **p99**: 99% of requests complete within this time
  - Worst-case performance (1 in 100 requests)
  - Often affected by GC pauses
  - Target: < 3s for normal load

### Throughput (req/s)

- Number of successful requests per second
- Depends on latency distribution
- Normal load: 20-25 req/s (file size ~5KB)
- Higher latency → lower throughput

### Error Rate

- Percentage of failed requests
- < 1% acceptable for normal conditions
- < 5% acceptable for peak load
- Anything > 10% indicates saturation/problems

### Memory Metrics

- **Memory Peak**: Maximum memory during test
  - Should be within limits (200MB for 98KB file)
  - Indicates memory-efficient implementation

- **Memory Growth Rate**: MB per minute
  - Should be near zero after initial allocation
  - Positive trend = potential memory leak
  - Target: < 5MB/min

## Common Performance Issues

### High Latency
**Cause**: TypeScript parsing and AST traversal
**Solution**:
- Parser is the primary bottleneck
- Large files naturally take longer
- Consider caching parsed ASTs for repeated files

### Memory Spikes
**Cause**: Large AST for complex files
**Solution**:
- Allocate memory proportional to file size
- GC cleanup may add 10-20ms pauses
- Normal and expected behavior

### Error Rate Increasing
**Cause**: System saturation
**Solution**:
- Indicates load limit reached
- Measure provides baseline for scaling decisions
- Consider request queuing or rate limiting

### Memory Leak Detection
**False Positives**:
- Initial allocation phase (first few hundred requests)
- Variable GC timing between runs
- Node.js heap management

**Real Leak Indicators**:
- Consistent memory growth across 10+ minute test
- Growth rate doesn't stabilize
- Same file analyzed repeatedly shows growth

## Adjusting Thresholds

Thresholds are defined in `tests/stress/config/thresholds.ts`:

```typescript
export const DEFAULT_THRESHOLDS: Thresholds = {
  normalLoad: {
    p50: 500,      // Adjust based on baseline
    p95: 1500,
    p99: 3000,
    errorRate: 0.01,
    throughput: 20,
  },
  // ... other categories
};
```

### When to Adjust

1. **After Initial Baseline**
   - Run all tests once to establish baseline
   - Adjust thresholds ±20% based on results
   - Document baseline in PR/commit

2. **After Infrastructure Changes**
   - New server hardware
   - Different Node.js version
   - TypeScript/Effect library updates

3. **After Code Optimization**
   - If you improve parser performance
   - If you add caching
   - If you refactor AST traversal

### Baseline vs Strict Modes

```bash
# Use baseline mode first
STRESS_MODE=baseline bun run test:stress

# Set thresholds conservatively based on results
# Then use strict mode for CI/validation
bun run test:stress
```

## Test Structure

### Directory Layout
```
tests/stress/
├── config/
│   ├── thresholds.ts          # Performance SLAs
│   └── test-data-config.ts    # Code generation config
├── generators/
│   ├── code-generator.ts       # Basic TypeScript generation
│   ├── anti-pattern-generator.ts  # Inject anti-patterns
│   └── complex-code-generator.ts  # Pathological cases
├── scenarios/
│   ├── edge-cases-test.ts      # Boundary conditions
│   ├── load-test.ts            # Concurrent requests
│   ├── volume-test.ts          # Large files
│   ├── spike-test.ts           # Traffic bursts
│   └── endurance-test.ts       # Long-running stability
├── utils/
│   ├── metrics-collector.ts    # Performance measurements
│   ├── server-control.ts       # Server lifecycle
│   └── report-generator.ts     # Results formatting
├── reports/
│   └── (generated test results)
├── stress-suite.test.ts        # Main orchestrator
└── STRESS_TESTING.md           # This file
```

### Test Execution

Tests are configured in `vitest.stress.config.ts`:
- Sequential execution (no parallelism)
- 10-minute timeout per test
- Reports saved to `tests/stress/reports/`

## Reports

### Viewing Results

**Console Output**:
```bash
# Automatic - printed during test execution
# Shows pass/fail status with colored output
```

**JSON Report**:
```bash
# Generated automatically
# Location: tests/stress/reports/report-TIMESTAMP.json
# Use for programmatic analysis and CI integration
```

**HTML Report**:
```bash
# Generated automatically
# Location: tests/stress/reports/report-TIMESTAMP.html
# Open in browser for visual presentation
```

### Report Contents

- Summary (pass/fail/warning counts)
- Per-test results with thresholds
- Detailed metrics (latency, throughput, memory)
- Timestamp and execution metadata

## Continuous Integration

### Basic CI Setup
```yaml
- name: Run Stress Tests
  if: github.event_name == 'pull_request'
  run: bun run test:stress

- name: Upload Reports
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: stress-test-reports
    path: tests/stress/reports/
```

### Threshold Enforcement
```bash
# Fail if critical tests don't pass
bun run test:stress || exit 1
```

## Performance Optimization Guide

### Profiling
1. Run stress tests with profiling enabled
2. Identify bottleneck (usually TypeScript parsing)
3. Consider caching or early termination strategies

### Caching Opportunities
- Cache parsed ASTs (invalidate on code change)
- Cache rule detection results
- Cache severity classifications

### Early Termination
- Return top 3 recommendations without finding all issues
- Stop analyzing after finding max severity items
- Skip analysis of non-relevant patterns

### Scaling
- Horizontal: Load balance across multiple instances
- Vertical: Increase server resources
- Hybrid: Both + caching + early termination

## Troubleshooting

### "Port already in use"
```bash
# Kill process on port
lsof -ti:3001,3002,3003,3004,3005 | xargs kill -9

# Or change port in tests
```

### "Connection timeout"
```bash
# Ensure server starts successfully
bun run dev &

# Check in another terminal if server responds
curl http://localhost:3000/api/review-code -X POST
```

### Inconsistent Results
```bash
# Warm up system
bun run test:stress:edge

# Then run actual test
bun run test:stress:load

# Or use baseline mode for discovery
STRESS_MODE=baseline bun run test:stress
```

### High Memory Usage
```bash
# Run one test at a time
bun run test:stress:edge
bun run test:stress:load
bun run test:stress:volume

# Check Node.js memory settings
node --max-old-space-size=4096 --max-semi-space-size=1024
```

## Contributing

When adding new stress tests:

1. **Add test file** to `tests/stress/scenarios/`
2. **Update thresholds** in `config/thresholds.ts` if needed
3. **Use MetricsCollector** for measurements
4. **Document** in this file
5. **Run full suite** to verify no conflicts
6. **Commit** with baseline measurements

## References

- [Performance Testing Best Practices](https://github.com/effect-ts/effect)
- [Vitest Documentation](https://vitest.dev/)
- [Node.js Profiling Guide](https://nodejs.org/en/docs/guides/simple-profiling/)

## Support

For questions or issues:

1. Check test logs in console output
2. Review generated HTML report
3. Consult troubleshooting section above
4. File issue with baseline measurements and logs
