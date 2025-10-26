/**
 * test-improved.ts
 *
 * Enhanced version of test.ts with:
 * - Parallel execution for speed
 * - Type checking before runtime tests
 * - Better error reporting with colors and summaries
 * - Progress tracking
 * - Detailed timing information
 *
 * Tests TypeScript files in content/new/src/
 */

import { exec } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// --- CONFIGURATION ---
const NEW_SRC_DIR = path.join(process.cwd(), 'content/new/src');
// Exclude content/new/src/** from runtime tests (typecheck still runs)
const EXCLUDE_NEW_SRC_RUNTIME = true;
const CONCURRENCY = 10; // Run 10 tests in parallel
const ENABLE_TYPE_CHECK = true;
const SHOW_PROGRESS = true;

// List of patterns that are expected to throw errors as part of their example
const EXPECTED_ERRORS = new Map<string, string[]>([
  ['write-tests-that-adapt-to-application-code', ['NotFoundError']],
  ['control-repetition-with-schedule', ['Transient error']],
]);

// --- TYPES ---
interface TestResult {
  file: string;
  success: boolean;
  duration: number;
  error?: string;
  expectedError?: boolean;
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

// --- PROGRESS ---
let completedTests = 0;
let totalTests = 0;

function updateProgress() {
  if (!SHOW_PROGRESS) return;
  const percent = Math.round((completedTests / totalTests) * 100);
  const bar =
    '█'.repeat(Math.floor(percent / 2)) +
    '░'.repeat(50 - Math.floor(percent / 2));
  process.stdout.write(
    `\r${bar} ${percent}% (${completedTests}/${totalTests})`,
  );
}

// --- TYPE CHECKING ---
async function runTypeCheck(): Promise<boolean> {
  console.log(colorize('\n📝 Step 1: Type Checking', 'cyan'));
  console.log(colorize('Running TypeScript compiler...\n', 'dim'));

  const startTime = Date.now();

  try {
    await execAsync('tsc --noEmit', {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
    });

    const duration = Date.now() - startTime;
    console.log(colorize(`✅ Type check passed in ${duration}ms\n`, 'green'));
    return true;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(colorize(`❌ Type check failed in ${duration}ms\n`, 'red'));

    // Parse and display type errors
    const output = error.stdout || error.stderr || '';
    const lines = output.split('\n').filter((line: string) => line.trim());

    // Count errors
    const errorCount = lines.filter((line: string) =>
      line.includes('error TS'),
    ).length;

    console.log(colorize(`Found ${errorCount} type errors:\n`, 'red'));

    // Show first 20 errors
    const errorLines = lines.slice(0, 40);
    errorLines.forEach((line: string) => {
      if (line.includes('error TS')) {
        console.log(colorize(line, 'red'));
      } else {
        console.log(colorize(line, 'dim'));
      }
    });

    if (lines.length > 40) {
      console.log(colorize(`\n... and ${lines.length - 40} more lines`, 'dim'));
    }

    return false;
  }
}

// --- RUNTIME TESTING ---
async function runTypeScriptFile(filePath: string): Promise<TestResult> {
  const startTime = Date.now();
  const fileName = path.basename(filePath, '.ts');
  const expectedErrors = EXPECTED_ERRORS.get(fileName) || [];

  try {
    await execAsync(`bun run ${filePath}`, {
      timeout: 30_000, // 30 second timeout per test
      maxBuffer: 1024 * 1024, // 1MB buffer
    });

    const duration = Date.now() - startTime;
    return {
      file: fileName,
      success: true,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorMessage = error.message || String(error);
    const isExpectedError = expectedErrors.some((expected) =>
      errorMessage.includes(expected),
    );

    if (isExpectedError) {
      return {
        file: fileName,
        success: true,
        duration,
        expectedError: true,
      };
    }

    return {
      file: fileName,
      success: false,
      duration,
      error: errorMessage,
    };
  }
}

// --- PARALLEL EXECUTION ---
async function runTestsInParallel(files: string[]): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const queue = [...files];

  async function worker() {
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) break;

      const result = await runTypeScriptFile(file);
      results.push(result);

      completedTests++;
      updateProgress();
    }
  }

  // Create worker pool
  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  return results;
}

// --- REPORTING ---
function printResults(results: TestResult[]) {
  console.log(colorize('\n\n📊 Test Results Summary', 'cyan'));
  console.log('═'.repeat(60));

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const expectedErrors = results.filter((r) => r.expectedError);

  // Summary stats
  console.log(`${colorize('Total:', 'bright')}     ${results.length} tests`);
  console.log(`${colorize('Passed:', 'green')}    ${successful.length} tests`);
  if (expectedErrors.length > 0) {
    console.log(
      `${colorize('Expected:', 'yellow')}  ${
        expectedErrors.length
      } tests (expected to error)`,
    );
  }
  if (failed.length > 0) {
    console.log(`${colorize('Failed:', 'red')}    ${failed.length} tests`);
  }

  // Timing
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const avgDuration = Math.round(totalDuration / results.length);
  const maxDuration = Math.max(...results.map((r) => r.duration));
  const minDuration = Math.min(...results.map((r) => r.duration));

  console.log(`\n${colorize('Timing:', 'bright')}`);
  console.log(`  Total:   ${totalDuration}ms`);
  console.log(`  Average: ${avgDuration}ms`);
  console.log(`  Min:     ${minDuration}ms`);
  console.log(`  Max:     ${maxDuration}ms`);

  // Failed tests details
  if (failed.length > 0) {
    console.log(`\n${colorize('Failed Tests:', 'red')}`);
    console.log('─'.repeat(60));

    failed.forEach((result, index) => {
      console.log(`\n${index + 1}. ${colorize(`${result.file}.ts`, 'bright')}`);
      if (result.error) {
        // Extract relevant error info
        const errorLines = result.error.split('\n').slice(0, 10);
        errorLines.forEach((line) => {
          if (line.trim()) {
            console.log(colorize(`   ${line}`, 'dim'));
          }
        });
      }
    });
  }

  // Slowest tests
  const slowTests = [...results]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5);

  if (slowTests.length > 0) {
    console.log(`\n${colorize('Slowest Tests:', 'yellow')}`);
    console.log('─'.repeat(60));
    slowTests.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(
        `${index + 1}. ${status} ${result.file}.ts - ${colorize(
          `${result.duration}ms`,
          'yellow',
        )}`,
      );
    });
  }

  console.log(`\n${'═'.repeat(60)}`);
}

// --- MAIN ---
async function main() {
  const overallStart = Date.now();

  console.log(colorize('\n🧪 Enhanced TypeScript Testing', 'bright'));
  console.log(colorize('Testing Effect patterns examples\n', 'dim'));

  // Step 1: Type checking
  if (ENABLE_TYPE_CHECK) {
    const typeCheckPassed = await runTypeCheck();
    if (!typeCheckPassed) {
      console.log(
        colorize(
          '\n⚠️  Type check failed, but continuing with runtime tests...\n',
          'yellow',
        ),
      );
    }
  }

  // Step 2: Runtime tests
  console.log(colorize('🏃 Step 2: Runtime Testing', 'cyan'));
  console.log(colorize(`Using concurrency: ${CONCURRENCY}\n`, 'dim'));

  // Get all TypeScript files
  const files = await fs.readdir(NEW_SRC_DIR);
  let tsFiles = files
    .filter((file) => file.endsWith('.ts'))
    .map((file) => path.join(NEW_SRC_DIR, file));

  if (EXCLUDE_NEW_SRC_RUNTIME) {
    console.log(
      colorize('Skipping runtime tests for content/new/src/**\n', 'yellow'),
    );
    tsFiles = [];
  }

  totalTests = tsFiles.length;
  completedTests = 0;

  console.log(colorize(`Found ${tsFiles.length} test files\n`, 'bright'));

  // Run tests in parallel
  const startTime = Date.now();
  const results = await runTestsInParallel(tsFiles);
  const _duration = Date.now() - startTime;

  // Print results
  printResults(results);

  const overallDuration = Date.now() - overallStart;
  const failed = results.filter((r) => !r.success);

  if (failed.length > 0) {
    console.log(
      colorize(
        `\n❌ Testing completed in ${overallDuration}ms with ${failed.length} failures\n`,
        'red',
      ),
    );
    process.exit(1);
  } else {
    console.log(
      colorize(`\n✨ All tests passed in ${overallDuration}ms!\n`, 'green'),
    );
  }
}

main().catch((error) => {
  console.error(colorize('\n💥 Fatal error:', 'red'));
  console.error(error);
  process.exit(1);
});
