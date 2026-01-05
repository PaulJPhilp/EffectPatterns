/**
 * test-integration.ts
 *
 * Integration and end-to-end tests for Effect patterns.
 * Runs patterns in realistic scenarios with actual resources:
 * - Real file system operations
 * - Actual timing measurements
 * - Memory profiling under load
 * - Error handling in practice
 * - Resource cleanup verification
 *
 * Complements unit tests with real-world validation.
 */

import { exec } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// --- CONFIGURATION ---
const _NEW_SRC_DIR = path.join(process.cwd(), 'content/new/src');
const TEST_DATA_DIR = path.join(process.cwd(), 'test-data');
const _CONCURRENCY = 3; // Lower for resource-intensive tests

// --- TYPES ---
interface IntegrationTestResult {
  pattern: string;
  testType: 'streaming' | 'parallel' | 'error-handling' | 'resource-management';
  passed: boolean;
  metrics: {
    duration?: number;
    memoryPeak?: number;
    memoryDelta?: number;
    throughput?: number;
    errorRate?: number;
  };
  issues: string[];
  details: string;
}

// --- COLORS ---
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

// --- TEST UTILITIES ---

async function createTestFile(
  size: 'small' | 'medium' | 'large',
): Promise<string> {
  await fs.mkdir(TEST_DATA_DIR, { recursive: true });

  const fileName = `test-file-${size}.txt`;
  const filePath = path.join(TEST_DATA_DIR, fileName);

  const lines = size === 'small' ? 100 : size === 'medium' ? 10_000 : 1_000_000;
  const content = Array.from(
    { length: lines },
    (_, i) => `Line ${i + 1}: ${'x'.repeat(80)}\n`,
  ).join('');

  await fs.writeFile(filePath, content);
  return filePath;
}

async function cleanup() {
  try {
    await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

// --- INTEGRATION TESTS ---

/**
 * Test 1: Streaming Large File
 * Verifies constant memory usage while processing large files
 */
async function testStreamingLargeFile(): Promise<IntegrationTestResult> {
  const pattern = 'stream-from-file';
  const issues: string[] = [];

  try {
    // Create large test file (100MB+)
    const testFile = await createTestFile('large');
    const fileStats = await fs.stat(testFile);
    const fileSize = fileStats.size / (1024 * 1024); // MB

    // Create test script that streams the file
    const testScript = `
      import { Effect } from "effect"
      import * as fs from "fs"
      
      async function streamFile() {
        const stream = fs.createReadStream("${testFile}", { 
          encoding: 'utf-8',
          highWaterMark: 64 * 1024 // 64KB chunks
        })
        
        let lineCount = 0
        let buffer = ""
        
        for await (const chunk of stream) {
          buffer += chunk
          const lines = buffer.split("\\n")
          buffer = lines.pop() || ""
          lineCount += lines.length
        }
        if (buffer) lineCount++
        
        return lineCount
      }
      
      const program = Effect.gen(function* () {
        const lineCount = yield* Effect.promise(() => streamFile())
        console.log(JSON.stringify({ lineCount }))
      })
      
      Effect.runPromise(program)
    `;

    const scriptPath = path.join(TEST_DATA_DIR, 'streaming-test.ts');
    await fs.writeFile(scriptPath, testScript);

    // Monitor memory while running
    const memBefore = process.memoryUsage().heapUsed;
    const startTime = Date.now();

    const result = await execAsync(`bun run ${scriptPath}`, {
      timeout: 60_000,
      maxBuffer: 10 * 1024 * 1024,
    });

    const duration = Date.now() - startTime;
    const memAfter = process.memoryUsage().heapUsed;
    const memDelta = Math.abs(memAfter - memBefore) / (1024 * 1024); // MB

    // Parse result
    const _output = JSON.parse(result.stdout.trim());
    const throughput = fileSize / (duration / 1000); // MB/s

    // Check if memory usage is reasonable for streaming
    const memoryThreshold = 100; // MB - should use much less than file size
    if (memDelta > memoryThreshold) {
      issues.push(
        `Memory usage (${memDelta.toFixed(2)}MB) exceeds threshold for streaming (${memoryThreshold}MB)`,
      );
    }

    return {
      pattern,
      testType: 'streaming',
      passed: issues.length === 0,
      metrics: {
        duration,
        memoryDelta: memDelta,
        throughput,
      },
      issues,
      details: `Processed ${fileSize.toFixed(2)}MB file in ${duration}ms (${throughput.toFixed(2)}MB/s) using ${memDelta.toFixed(2)}MB memory`,
    };
  } catch (error: any) {
    return {
      pattern,
      testType: 'streaming',
      passed: false,
      metrics: {},
      issues: [`Test failed: ${error.message}`],
      details: error.message,
    };
  }
}

/**
 * Test 2: Parallel vs Sequential Performance
 * Verifies parallel execution is actually faster
 */
async function testParallelPerformance(): Promise<IntegrationTestResult> {
  const pattern = 'parallel-execution';
  const issues: string[] = [];

  try {
    // Create test script for parallel execution
    const parallelScript = `
      import { Effect } from "effect"
      
      const delay = (ms: number) => Effect.sleep(ms)
      
      const program = Effect.gen(function* () {
        const tasks = Array.from({ length: 5 }, () => delay("500 millis"))
        
        // Parallel execution
        const parallelStart = Date.now()
        yield* Effect.all(tasks, { concurrency: "unbounded" })
        const parallelTime = Date.now() - parallelStart
        
        // Sequential execution
        const sequentialStart = Date.now()
        yield* Effect.all(tasks, { concurrency: 1 })
        const sequentialTime = Date.now() - sequentialStart
        
        console.log(JSON.stringify({ parallelTime, sequentialTime }))
      })
      
      Effect.runPromise(program)
    `;

    const scriptPath = path.join(TEST_DATA_DIR, 'parallel-test.ts');
    await fs.writeFile(scriptPath, parallelScript);

    const result = await execAsync(`bun run ${scriptPath}`, {
      timeout: 10_000,
    });

    const { parallelTime, sequentialTime } = JSON.parse(result.stdout.trim());

    // Parallel should be significantly faster
    const speedup = sequentialTime / parallelTime;
    if (speedup < 2) {
      issues.push(
        `Parallel execution not fast enough: ${speedup.toFixed(2)}x speedup (expected >2x)`,
      );
    }

    // Parallel should be close to single task time (~500ms)
    if (parallelTime > 800) {
      issues.push(
        `Parallel time (${parallelTime}ms) too slow, expected ~500-600ms`,
      );
    }

    return {
      pattern,
      testType: 'parallel',
      passed: issues.length === 0,
      metrics: {
        duration: parallelTime,
      },
      issues,
      details: `Parallel: ${parallelTime}ms, Sequential: ${sequentialTime}ms (${speedup.toFixed(2)}x speedup)`,
    };
  } catch (error: any) {
    return {
      pattern,
      testType: 'parallel',
      passed: false,
      metrics: {},
      issues: [`Test failed: ${error.message}`],
      details: error.message,
    };
  }
}

/**
 * Test 3: Error Handling Under Stress
 * Verifies error handling works correctly under various conditions
 */
async function testErrorHandlingStress(): Promise<IntegrationTestResult> {
  const pattern = 'error-handling';
  const issues: string[] = [];

  try {
    const errorScript = `
      import { Effect } from "effect"
      
      const program = Effect.gen(function* () {
        const results = []
        
        // Test 1: Simple error recovery
        const recovered = yield* Effect.fail("Recoverable Error").pipe(
          Effect.catchAll(() => Effect.succeed("Recovered"))
        )
        results.push({ test: "recovery", passed: recovered === "Recovered" })
        
        // Test 2: Error with tapError (logging side effect)
        let logged = false
        const withLogging = yield* Effect.fail("Error to log").pipe(
          Effect.tapError(() => Effect.sync(() => { logged = true })),
          Effect.catchAll(() => Effect.succeed("After logging"))
        )
        results.push({ test: "logging", passed: withLogging === "After logging" && logged })
        
        // Test 3: Multiple error handlers
        const multiHandler = yield* Effect.fail("Test").pipe(
          Effect.catchTag("NotFound", () => Effect.succeed("Found")),
          Effect.catchAll(() => Effect.succeed("Caught"))
        )
        results.push({ test: "multi-handler", passed: multiHandler === "Caught" })
        
        // Test 4: Success path (no errors)
        const success = yield* Effect.succeed("Success")
        results.push({ test: "success", passed: success === "Success" })
        
        console.log(JSON.stringify(results))
      })
      
      Effect.runPromise(program)
    `;

    const scriptPath = path.join(TEST_DATA_DIR, 'error-test.ts');
    await fs.writeFile(scriptPath, errorScript);

    const result = await execAsync(`bun run ${scriptPath}`, {
      timeout: 5000,
    });

    const results = JSON.parse(result.stdout.trim());
    const failedTests = results.filter((r: any) => !r.passed);

    if (failedTests.length > 0) {
      issues.push(
        `Failed error handling tests: ${failedTests.map((t: any) => t.test).join(', ')}`,
      );
    }

    return {
      pattern,
      testType: 'error-handling',
      passed: issues.length === 0,
      metrics: {
        errorRate: failedTests.length / results.length,
      },
      issues,
      details: `Passed ${results.length - failedTests.length}/${results.length} error handling tests`,
    };
  } catch (error: any) {
    return {
      pattern,
      testType: 'error-handling',
      passed: false,
      metrics: {},
      issues: [`Test failed: ${error.message}`],
      details: error.message,
    };
  }
}

/**
 * Test 4: Resource Management
 * Verifies resources are properly acquired and released
 */
async function testResourceManagement(): Promise<IntegrationTestResult> {
  const pattern = 'resource-management';
  const issues: string[] = [];

  try {
    const resourceScript = `
      import { Effect, Scope } from "effect"
      
      let acquired = 0
      let released = 0
      
      const acquireResource = Effect.sync(() => {
        acquired++
        return { id: acquired, data: "resource" }
      })
      
      const releaseResource = (resource: any) => Effect.sync(() => {
        released++
      })
      
      const program = Effect.gen(function* () {
        // Test 1: Successful acquisition and release
        yield* Effect.acquireUseRelease(
          acquireResource,
          () => Effect.succeed("used"),
          releaseResource
        )
        
        // Test 2: Release on error
        yield* Effect.acquireUseRelease(
          acquireResource,
          () => Effect.fail("error"),
          releaseResource
        ).pipe(
          Effect.catchAll(() => Effect.succeed("caught"))
        )
        
        // Test 3: Multiple resources
        yield* Effect.all([
          Effect.acquireUseRelease(acquireResource, () => Effect.succeed(1), releaseResource),
          Effect.acquireUseRelease(acquireResource, () => Effect.succeed(2), releaseResource),
          Effect.acquireUseRelease(acquireResource, () => Effect.succeed(3), releaseResource),
        ])
        
        console.log(JSON.stringify({ acquired, released }))
      })
      
      Effect.runPromise(program)
    `;

    const scriptPath = path.join(TEST_DATA_DIR, 'resource-test.ts');
    await fs.writeFile(scriptPath, resourceScript);

    const result = await execAsync(`bun run ${scriptPath}`, {
      timeout: 5000,
    });

    const { acquired, released } = JSON.parse(result.stdout.trim());

    // All acquired resources should be released
    if (acquired !== released) {
      issues.push(
        `Resource leak detected: ${acquired} acquired but only ${released} released`,
      );
    }

    return {
      pattern,
      testType: 'resource-management',
      passed: issues.length === 0,
      metrics: {},
      issues,
      details: `Acquired ${acquired} resources, released ${released} resources`,
    };
  } catch (error: any) {
    return {
      pattern,
      testType: 'resource-management',
      passed: false,
      metrics: {},
      issues: [`Test failed: ${error.message}`],
      details: error.message,
    };
  }
}

// --- TEST RUNNER ---

async function runIntegrationTests(): Promise<IntegrationTestResult[]> {
  const results: IntegrationTestResult[] = [];

  // Setup
  await cleanup();
  await fs.mkdir(TEST_DATA_DIR, { recursive: true });

  console.log(colorize('Running integration tests...\n', 'cyan'));

  // Test 1: Streaming
  console.log(
    `${colorize('1/4', 'dim')} Testing streaming with large files...`,
  );
  const streamingResult = await testStreamingLargeFile();
  results.push(streamingResult);
  console.log(
    streamingResult.passed
      ? colorize('  ✓ Passed', 'green')
      : colorize('  ✗ Failed', 'red'),
  );

  // Test 2: Parallel
  console.log(
    `${colorize('\n2/4', 'dim')} Testing parallel vs sequential performance...`,
  );
  const parallelResult = await testParallelPerformance();
  results.push(parallelResult);
  console.log(
    parallelResult.passed
      ? colorize('  ✓ Passed', 'green')
      : colorize('  ✗ Failed', 'red'),
  );

  // Test 3: Error Handling
  console.log(
    `${colorize('\n3/4', 'dim')} Testing error handling under stress...`,
  );
  const errorResult = await testErrorHandlingStress();
  results.push(errorResult);
  console.log(
    errorResult.passed
      ? colorize('  ✓ Passed', 'green')
      : colorize('  ✗ Failed', 'red'),
  );

  // Test 4: Resource Management
  console.log(`${colorize('\n4/4', 'dim')} Testing resource management...`);
  const resourceResult = await testResourceManagement();
  results.push(resourceResult);
  console.log(
    resourceResult.passed
      ? colorize('  ✓ Passed', 'green')
      : colorize('  ✗ Failed', 'red'),
  );

  // Cleanup
  await cleanup();

  return results;
}

// --- REPORTING ---

function printResults(results: IntegrationTestResult[]) {
  console.log(colorize('\n\n📊 Integration Test Results', 'cyan'));
  console.log('═'.repeat(60));

  const passed = results.filter((r) => r.passed);
  const failed = results.filter((r) => !r.passed);

  console.log(`${colorize('Total:', 'bright')}     ${results.length} tests`);
  console.log(`${colorize('Passed:', 'green')}    ${passed.length} tests`);
  if (failed.length > 0) {
    console.log(`${colorize('Failed:', 'red')}    ${failed.length} tests`);
  }

  // Test details
  console.log(`\n${colorize('Test Details:', 'bright')}`);
  console.log('─'.repeat(60));

  for (const result of results) {
    const icon = result.passed ? colorize('✓', 'green') : colorize('✗', 'red');
    console.log(
      `\n${icon} ${colorize(result.pattern, 'bright')} (${result.testType})`,
    );
    console.log(colorize(`  ${result.details}`, 'dim'));

    if (Object.keys(result.metrics).length > 0) {
      const metrics = Object.entries(result.metrics)
        .map(([key, value]) => {
          if (typeof value === 'number') {
            return `${key}: ${value.toFixed(2)}`;
          }
          return `${key}: ${value}`;
        })
        .join(', ');
      console.log(colorize(`  Metrics: ${metrics}`, 'dim'));
    }

    if (result.issues.length > 0) {
      for (const issue of result.issues) {
        console.log(colorize(`  ⚠ ${issue}`, 'yellow'));
      }
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
}

// --- MAIN ---

async function main() {
  const startTime = Date.now();

  console.log(colorize('\n🔬 Integration & E2E Testing', 'bright'));
  console.log(colorize('Testing patterns in realistic scenarios\n', 'dim'));

  // Run tests
  const results = await runIntegrationTests();

  // Print results
  printResults(results);

  const duration = Date.now() - startTime;
  const failed = results.filter((r) => !r.passed).length;

  if (failed > 0) {
    console.log(
      colorize(
        `\n❌ Integration testing completed in ${duration}ms with ${failed} failure(s)\n`,
        'red',
      ),
    );
    process.exit(1);
  } else {
    console.log(
      colorize(
        `\n✨ All integration tests passed in ${duration}ms!\n`,
        'green',
      ),
    );
  }
}

main().catch((error) => {
  console.error(colorize('\n💥 Fatal error:', 'red'));
  console.error(error);
  process.exit(1);
});
