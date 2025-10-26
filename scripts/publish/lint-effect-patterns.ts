/**
 * lint-effect-patterns.ts
 *
 * Custom linter for Effect-TS patterns and idioms.
 * Detects non-idiomatic code that Biome can't catch:
 * - Effect.catchAll + Effect.gen for logging (use tapError)
 * - Missing concurrency options in Effect.all
 * - Deprecated API usage
 * - Non-idiomatic Effect patterns
 *
 * Complements Biome's general linting with Effect-specific checks.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// --- CONFIGURATION ---
const NEW_SRC_DIR = path.join(process.cwd(), 'content/new/src');
const PUBLISHED_SRC_DIR = path.join(process.cwd(), 'content/src');
const CONCURRENCY = 10;

// --- TYPES ---
interface LintIssue {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  line: number;
  column: number;
  suggestion?: string;
}

interface LintResult {
  file: string;
  issues: LintIssue[];
  errors: number;
  warnings: number;
  info: number;
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

// --- LINT RULES ---

/**
 * Rule: effect-use-taperror
 * Detects: Effect.catchAll with Effect.gen just for logging
 * Suggests: Use Effect.tapError instead
 */
function checkUseTapError(content: string, _filePath: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Pattern: .catchAll((error) => Effect.gen(function* () { yield* Effect.log(...) }))
    if (
      line.includes('catchAll') &&
      i + 1 < lines.length &&
      lines[i + 1].includes('Effect.gen')
    ) {
      // Check if the next few lines only contain Effect.log or console.log
      let nextLines = '';
      let _endFound = false;
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        nextLines += lines[j];
        if (lines[j].includes('))')) {
          _endFound = true;
          break;
        }
      }

      // If it's just logging, suggest tapError
      if (
        (nextLines.includes('Effect.log') ||
          nextLines.includes('console.log')) &&
        !nextLines.includes('return') &&
        !nextLines.includes('Effect.fail') &&
        !nextLines.includes('Effect.succeed')
      ) {
        issues.push({
          rule: 'effect-use-taperror',
          severity: 'warning',
          message:
            'Use Effect.tapError for side-effect logging instead of Effect.catchAll + Effect.gen',
          line: i + 1,
          column: line.indexOf('catchAll') + 1,
          suggestion:
            'Replace with: .pipe(Effect.tapError((error) => Effect.log(...)), Effect.catchAll(...))',
        });
      }
    }
  }

  return issues;
}

/**
 * Rule: effect-explicit-concurrency
 * Detects: Effect.all without explicit concurrency option
 * Suggests: Add { concurrency: "unbounded" } or { concurrency: N }
 */
function checkExplicitConcurrency(
  content: string,
  filePath: string,
): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = content.split('\n');
  const fileName = path.basename(filePath, '.ts');

  // Skip patterns that are explicitly about sequential execution
  if (
    fileName.includes('sequential') ||
    fileName.includes('sequence') ||
    content.includes('// sequential by design')
  ) {
    return issues;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Pattern: Effect.all(...) without { concurrency: ... }
    if (line.includes('Effect.all(') && !line.includes('concurrency')) {
      // Check if concurrency is on the next line
      let hasConcurrency = false;
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        if (lines[j].includes('concurrency')) {
          hasConcurrency = true;
          break;
        }
      }

      if (!hasConcurrency) {
        // Check if it's a parallel pattern
        const isParallelPattern =
          fileName.includes('parallel') ||
          fileName.includes('concurrent') ||
          content.includes('// parallel') ||
          content.includes('// concurrently');

        issues.push({
          rule: 'effect-explicit-concurrency',
          severity: isParallelPattern ? 'error' : 'warning',
          message: isParallelPattern
            ? "Effect.all runs sequentially by default. Add { concurrency: 'unbounded' } for parallel execution"
            : 'Effect.all should explicitly specify concurrency option (default is sequential)',
          line: i + 1,
          column: line.indexOf('Effect.all') + 1,
          suggestion: isParallelPattern
            ? "Add: { concurrency: 'unbounded' }"
            : "Add: { concurrency: 'unbounded' } or { concurrency: N }",
        });
      }
    }
  }

  return issues;
}

/**
 * Rule: effect-deprecated-api
 * Detects: Usage of deprecated Effect APIs
 */
function checkDeprecatedAPIs(content: string, _filePath: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = content.split('\n');

  const deprecatedAPIs = [
    {
      pattern: /Effect\.fromOption\(/,
      replacement: 'Option.match with Effect.succeed/Effect.fail',
      reason: 'Effect.fromOption is deprecated',
    },
    {
      pattern: /Effect\.fromEither\(/,
      replacement: 'Either.match with Effect.succeed/Effect.fail',
      reason: 'Effect.fromEither is deprecated',
    },
    {
      pattern: /Option\.zip\(/,
      replacement: 'Option.all',
      reason: 'Option.zip is deprecated, use Option.all',
    },
    {
      pattern: /Either\.zip\(/,
      replacement: 'Either.all',
      reason: 'Either.zip is deprecated, use Either.all',
    },
    {
      pattern: /Option\.cond\(/,
      replacement: 'ternary expression with Option.some/Option.none',
      reason: 'Option.cond is deprecated',
    },
    {
      pattern: /Either\.cond\(/,
      replacement: 'ternary expression with Either.right/Either.left',
      reason: 'Either.cond is deprecated',
    },
    {
      pattern: /Effect\.matchTag\(/,
      replacement: 'Effect.catchTags',
      reason: 'Effect.matchTag is deprecated, use Effect.catchTags',
    },
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const api of deprecatedAPIs) {
      if (api.pattern.test(line)) {
        issues.push({
          rule: 'effect-deprecated-api',
          severity: 'error',
          message: api.reason,
          line: i + 1,
          column: line.search(api.pattern) + 1,
          suggestion: `Use ${api.replacement} instead`,
        });
      }
    }
  }

  return issues;
}

/**
 * Rule: effect-prefer-pipe
 * Detects: Long .then() chains or nested calls
 * Suggests: Use pipe for composition
 */
function checkPreferPipe(content: string, _filePath: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Count method chains
    const chainCount = (line.match(/\)\./g) || []).length;

    // If more than 3 chained calls, suggest pipe
    if (chainCount > 3 && !line.includes('pipe(')) {
      issues.push({
        rule: 'effect-prefer-pipe',
        severity: 'info',
        message:
          'Consider using pipe() for better readability with long chains',
        line: i + 1,
        column: 1,
        suggestion: 'Refactor to: pipe(value, fn1, fn2, fn3, ...)',
      });
    }
  }

  return issues;
}

/**
 * Rule: effect-stream-memory
 * Detects: Non-streaming operations in stream patterns
 */
function checkStreamMemory(content: string, filePath: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = content.split('\n');
  const fileName = path.basename(filePath, '.ts');

  // Only check files that claim to be streaming
  if (!fileName.includes('stream')) {
    return issues;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect loading entire file/array into memory
    if (
      line.includes('readFileString') ||
      (line.includes('readFile') &&
        !line.includes('Stream') &&
        !line.includes('pipe'))
    ) {
      issues.push({
        rule: 'effect-stream-memory',
        severity: 'error',
        message:
          'Streaming pattern loads entire content into memory. Use proper streaming.',
        line: i + 1,
        column: line.indexOf('readFile') + 1,
        suggestion:
          "Use: fs.readFile(path).pipe(Stream.decodeText('utf-8'), Stream.splitLines)",
      });
    }

    // Detect collecting entire stream before processing
    if (
      line.includes('Stream.runCollect') &&
      i > 0 &&
      !lines[i - 5]?.includes('// Intentionally collecting')
    ) {
      issues.push({
        rule: 'effect-stream-memory',
        severity: 'warning',
        message:
          'Stream.runCollect loads entire stream into memory. Consider using Stream.run instead.',
        line: i + 1,
        column: line.indexOf('Stream.runCollect') + 1,
        suggestion: 'Use Stream.run or other streaming combinators',
      });
    }
  }

  return issues;
}

/**
 * Rule: effect-error-model
 * Detects: Generic Error instead of typed errors
 */
function checkErrorModel(content: string, _filePath: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Pattern: Effect<..., Error, ...> or Effect.fail(new Error(...))
    if (
      (line.includes('Effect<') && line.includes(', Error,')) ||
      (line.includes('Effect.fail') && line.includes('new Error('))
    ) {
      // Skip if it's in a comment or example of what NOT to do
      if (
        line.trim().startsWith('//') ||
        lines[i - 1]?.includes('Anti-Pattern') ||
        lines[i - 1]?.includes('Bad:')
      ) {
        continue;
      }

      issues.push({
        rule: 'effect-error-model',
        severity: 'info',
        message:
          'Consider using typed errors (Data.TaggedError) instead of generic Error',
        line: i + 1,
        column: line.indexOf('Error') + 1,
        suggestion:
          "Define: class MyError extends Data.TaggedError('MyError')<{...}>",
      });
    }
  }

  return issues;
}

// --- LINTER ---

async function lintFile(filePath: string): Promise<LintResult> {
  const fileName = path.basename(filePath, '.ts');
  const content = await fs.readFile(filePath, 'utf-8');

  const allIssues: LintIssue[] = [
    ...checkUseTapError(content, filePath),
    ...checkExplicitConcurrency(content, filePath),
    ...checkDeprecatedAPIs(content, filePath),
    ...checkPreferPipe(content, filePath),
    ...checkStreamMemory(content, filePath),
    ...checkErrorModel(content, filePath),
  ];

  // Sort by line number
  allIssues.sort((a, b) => a.line - b.line);

  const errors = allIssues.filter((i) => i.severity === 'error').length;
  const warnings = allIssues.filter((i) => i.severity === 'warning').length;
  const info = allIssues.filter((i) => i.severity === 'info').length;

  return {
    file: fileName,
    issues: allIssues,
    errors,
    warnings,
    info,
  };
}

// --- PARALLEL EXECUTION ---
async function lintInParallel(files: string[]): Promise<LintResult[]> {
  const results: LintResult[] = [];
  const queue = [...files];

  async function worker() {
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) break;

      const result = await lintFile(file);
      results.push(result);
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  return results;
}

// --- REPORTING ---
function printResults(results: LintResult[]) {
  console.log(colorize('\n📋 Effect Patterns Linter Results', 'cyan'));
  console.log('═'.repeat(60));

  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings, 0);
  const totalInfo = results.reduce((sum, r) => sum + r.info, 0);
  const clean = results.filter(
    (r) => r.errors === 0 && r.warnings === 0,
  ).length;

  console.log(`${colorize('Total:', 'bright')}     ${results.length} files`);
  console.log(`${colorize('Clean:', 'green')}     ${clean} files`);
  if (totalErrors > 0) {
    console.log(`${colorize('Errors:', 'red')}    ${totalErrors} issues`);
  }
  if (totalWarnings > 0) {
    console.log(`${colorize('Warnings:', 'yellow')}  ${totalWarnings} issues`);
  }
  if (totalInfo > 0) {
    console.log(`${colorize('Info:', 'blue')}      ${totalInfo} suggestions`);
  }

  // Files with errors
  const filesWithErrors = results.filter((r) => r.errors > 0);
  if (filesWithErrors.length > 0) {
    console.log(`\n${colorize('❌ Files with Errors:', 'red')}`);
    console.log('─'.repeat(60));

    for (const result of filesWithErrors) {
      console.log(`\n${colorize(`${result.file}.ts`, 'bright')}`);

      for (const issue of result.issues) {
        if (issue.severity === 'error') {
          console.log(
            colorize(
              `  ${issue.line}:${issue.column} - ${issue.rule}: ${issue.message}`,
              'red',
            ),
          );
          if (issue.suggestion) {
            console.log(colorize(`    → ${issue.suggestion}`, 'dim'));
          }
        }
      }
    }
  }

  // Files with warnings
  const filesWithWarnings = results.filter(
    (r) => r.warnings > 0 && r.errors === 0,
  );
  if (filesWithWarnings.length > 0) {
    console.log(`\n${colorize('⚠️  Files with Warnings:', 'yellow')}`);
    console.log('─'.repeat(60));

    for (const result of filesWithWarnings) {
      console.log(`\n${colorize(`${result.file}.ts`, 'bright')}`);

      for (const issue of result.issues) {
        if (issue.severity === 'warning') {
          console.log(
            colorize(
              `  ${issue.line}:${issue.column} - ${issue.rule}: ${issue.message}`,
              'yellow',
            ),
          );
          if (issue.suggestion) {
            console.log(colorize(`    → ${issue.suggestion}`, 'dim'));
          }
        }
      }
    }
  }

  // Info suggestions (only show count, not details)
  if (totalInfo > 0) {
    console.log(
      `\n${colorize(`ℹ️  ${totalInfo} style suggestions available`, 'blue')}`,
    );
    console.log(colorize('  Run with --verbose to see details', 'dim'));
  }

  console.log(`\n${'═'.repeat(60)}`);
}

// --- MAIN ---
async function main() {
  const startTime = Date.now();

  console.log(colorize('\n🔍 Effect Patterns Linter', 'bright'));
  console.log(
    colorize('Checking Effect-TS idioms and best practices\n', 'dim'),
  );

  // Get all TypeScript files from new and published
  const newFiles = await fs.readdir(NEW_SRC_DIR);
  const newTsFiles = newFiles
    .filter((file) => file.endsWith('.ts'))
    .map((file) => path.join(NEW_SRC_DIR, file));

  try {
    const publishedFiles = await fs.readdir(PUBLISHED_SRC_DIR);
    const publishedTsFiles = publishedFiles
      .filter((file) => file.endsWith('.ts'))
      .map((file) => path.join(PUBLISHED_SRC_DIR, file));
    newTsFiles.push(...publishedTsFiles);
  } catch {
    // Published dir might not exist yet
  }

  const allFiles = newTsFiles;
  console.log(colorize(`Found ${allFiles.length} files to lint\n`, 'bright'));

  // Run linter
  const results = await lintInParallel(allFiles);

  // Print results
  printResults(results);

  const duration = Date.now() - startTime;
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings, 0);

  if (totalErrors > 0) {
    console.log(
      colorize(
        `\n❌ Linting completed in ${duration}ms with ${totalErrors} error(s)\n`,
        'red',
      ),
    );
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log(
      colorize(
        `\n⚠️  Linting completed in ${duration}ms with ${totalWarnings} warning(s)\n`,
        'yellow',
      ),
    );
  } else {
    console.log(
      colorize(
        `\n✨ All files passed Effect patterns linting in ${duration}ms!\n`,
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
