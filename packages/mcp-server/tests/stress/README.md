# Stress Testing Suite

Comprehensive stress testing suite for the `review_code` MCP tool.

## Quick Start

```bash
# Run all stress tests
bun run test:stress

# Run specific test suite
bun run test:stress:edge      # Boundary conditions
bun run test:stress:load      # Concurrent requests
bun run test:stress:volume    # Large files
bun run test:stress:spike     # Traffic bursts
bun run test:stress:endurance # Long-running stability

# Run with relaxed thresholds (for baseline discovery)
STRESS_MODE=baseline bun run test:stress
```

## Test Suites

### Edge Cases (Highest Priority)
- **File**: `scenarios/edge-cases-test.ts`
- **Duration**: ~5 min
- **Validates**: Correctness, error handling, boundary values
- **Command**: `bun run test:stress:edge`

### Load Tests (High Priority)
- **File**: `scenarios/load-test.ts`
- **Duration**: ~5 min
- **Validates**: Concurrent requests, throughput, latency distribution
- **Command**: `bun run test:stress:load`

### Volume Tests (High Priority)
- **File**: `scenarios/volume-test.ts`
- **Duration**: ~3 min
- **Validates**: Large files, complex patterns, resource limits
- **Command**: `bun run test:stress:volume`

### Spike Tests (Medium Priority)
- **File**: `scenarios/spike-test.ts`
- **Duration**: ~10 min
- **Validates**: Traffic burst resilience, recovery time
- **Command**: `bun run test:stress:spike`

### Endurance Tests (Medium Priority)
- **File**: `scenarios/endurance-test.ts`
- **Duration**: 40+ min (memory leak detection)
- **Validates**: Long-running stability, memory trends
- **Command**: `bun run test:stress:endurance`

## Directory Structure

```
tests/stress/
├── config/
│   └── thresholds.ts                 # Performance SLAs
├── generators/
│   ├── code-generator.ts             # TypeScript code generation
│   ├── anti-pattern-generator.ts     # Inject known anti-patterns
│   └── complex-code-generator.ts     # Pathological test cases
├── scenarios/
│   ├── edge-cases-test.ts            # Boundary and error tests
│   ├── load-test.ts                  # Concurrent load tests
│   ├── volume-test.ts                # Large file tests
│   ├── spike-test.ts                 # Traffic burst tests
│   └── endurance-test.ts             # Long-running tests
├── utils/
│   ├── metrics-collector.ts          # Performance measurement
│   ├── server-control.ts             # Server lifecycle management
│   └── report-generator.ts           # Results formatting
├── reports/
│   └── (auto-generated test results)
├── stress-suite.test.ts              # Main orchestrator
├── README.md                         # This file
└── STRESS_TESTING.md                 # Detailed documentation
```

## Key Components

### Code Generators
Generate realistic TypeScript code with configurable complexity:

```typescript
import { generateTypeScriptFile, PRESET_CONFIGS } from './generators/code-generator';

// Simple file (5KB)
const code = generateTypeScriptFile(PRESET_CONFIGS.small());

// Near limit (98KB)
const code = generateTypeScriptFile(PRESET_CONFIGS.nearLimit());

// With anti-patterns
import { generateFlawedCodeFile } from './generators/anti-pattern-generator';
const flawed = generateFlawedCodeFile(options, 'heavilyFlawed');
```

### Metrics Collection
Collect and analyze performance metrics:

```typescript
import { createMetricsCollector } from './utils/metrics-collector';

const metrics = createMetricsCollector();
metrics.start();

// ... make requests ...

metrics.finish();
const analysis = metrics.calculateMetrics();
console.log(metrics.getSummary());
```

### Report Generation
Generate formatted reports:

```typescript
import { createReportGenerator } from './utils/report-generator';

const reporter = createReportGenerator();
reporter.addResult(testResult);

reporter.toConsole();                      // Print colored output
const json = reporter.toJSON();            // JSON string
const html = reporter.toHTML();            // HTML page
reporter.save('tests/stress/reports');    // Save all formats
```

## Test Thresholds

All thresholds defined in `config/thresholds.ts`:

| Metric | Normal Load | Peak Load | Large File |
|--------|-------------|-----------|-----------|
| p50 Latency | 500ms | 1000ms | 500ms |
| p95 Latency | 1500ms | 3000ms | 2000ms |
| p99 Latency | 3000ms | 5000ms | - |
| Error Rate | 1% | 5% | 0% |
| Throughput | 20+ req/s | 15+ req/s | N/A |

## Performance Targets

### Small File (5KB)
- p95: < 1s
- Throughput: > 20 req/s
- Memory: < 50MB

### Medium File (25KB)
- p95: < 2s
- Throughput: > 15 req/s
- Memory: < 100MB

### Large File (90KB)
- p95: < 3s
- Throughput: > 10 req/s
- Memory: < 150MB

### Near-Limit File (98KB)
- Total time: < 5s
- Memory peak: < 200MB

## Common Tasks

### Run Baseline Discovery
```bash
# First time: identify actual performance
STRESS_MODE=baseline bun run test:stress

# Update thresholds in config/thresholds.ts
# based on measured results
```

### Run Critical Path Only
```bash
# Edge cases + Load tests (most important)
bun run test:stress:edge && bun run test:stress:load
```

### Profile Performance
```bash
# Add profiling flags
node --prof tests/stress/scenarios/volume-test.ts
```

### Compare Results
```bash
# Save baseline before changes
bun run test:stress > baseline.txt

# Make changes, then compare
bun run test:stress > current.txt
diff baseline.txt current.txt
```

### Debug Failures
```bash
# Run with verbose output
DEBUG=* bun run test:stress:edge

# Run individual test
bun test tests/stress/scenarios/edge-cases-test.ts
```

## Reports

Tests automatically generate reports in `tests/stress/reports/`:

- **results.json** - Machine-readable results (updated after each run)
- **report-TIMESTAMP.json** - Detailed JSON report
- **report-TIMESTAMP.html** - Visual HTML report
- **latest.json** - Symlink to most recent results

## Integration with CI

Add to GitHub Actions or similar:

```yaml
- name: Stress Tests
  run: bun run test:stress

- name: Upload Report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: stress-reports
    path: tests/stress/reports/
```

## Troubleshooting

### Port Already in Use
```bash
# Kill server processes
lsof -ti:3001,3002,3003,3004,3005 | xargs kill -9
```

### Memory Issues
```bash
# Increase Node.js heap
node --max-old-space-size=4096 $(which bun) run test:stress
```

### Inconsistent Results
```bash
# Warm up system first
bun run test:stress:edge

# Then run actual test
bun run test:stress:load
```

## Further Reading

- **[STRESS_TESTING.md](./STRESS_TESTING.md)** - Detailed testing guide
- **[config/thresholds.ts](./config/thresholds.ts)** - Performance SLAs
- **[generators/code-generator.ts](./generators/code-generator.ts)** - Code generation
- **[Vitest Documentation](https://vitest.dev/)** - Test framework
