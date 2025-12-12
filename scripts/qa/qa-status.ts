/**
 * qa-status.ts
 *
 * QA status script using CLI commands. Shows current pass/fail statistics
 * from QA results without running full validation.
 *
 * Usage:
 *   bun run qa:status [--new]    # Status for new patterns (content/new/qa)
 *   bun run qa:status             # Status for published patterns (content/qa)
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// --- CONFIGURATION ---
const PROJECT_ROOT = process.cwd();
const useNewPatterns = process.argv.includes('--new');
const QA_DIR = useNewPatterns
  ? path.join(PROJECT_ROOT, 'content/new/qa')
  : path.join(PROJECT_ROOT, 'content/qa');
const RESULTS_DIR = path.join(QA_DIR, 'results');

// --- STATUS CHECK ---
async function showStatus() {
  const patternType = useNewPatterns ? 'New Patterns' : 'Published Patterns';
  console.log(`QA Status Report - ${patternType}`);
  console.log('='.repeat(40));
  console.log(`Source: ${QA_DIR}\n`);

  try {
    // Check if results exist
    const files = await fs.readdir(RESULTS_DIR);
    const qaResults = files.filter((f) => f.endsWith('-qa.json'));

    if (qaResults.length === 0) {
      const processCmd = useNewPatterns
        ? 'bun run qa:process --new'
        : 'bun run qa:process';
      console.log('No QA results found.');
      console.log(`Run "${processCmd}" to generate QA results.`);
      return;
    }

    console.log(`Found ${qaResults.length} QA result files`);

    // Load and summarize results
    let total = 0;
    let passed = 0;
    let failed = 0;
    const failuresByCategory: Record<string, number> = {};
    const skillLevels: Record<string, { passed: number; failed: number }> = {};

    for (const file of qaResults) {
      const filePath = path.join(RESULTS_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const result = JSON.parse(content);

      total++;

      if (result.validation?.passed) {
        passed++;
      } else {
        failed++;

        // Categorize failures
        if (result.validation?.errors) {
          for (const error of result.validation.errors) {
            const category = categorizeError(error);
            failuresByCategory[category] =
              (failuresByCategory[category] || 0) + 1;
          }
        }
      }

      // Track by skill level
      const level = result.metadata?.skillLevel || 'unknown';
      if (!skillLevels[level]) {
        skillLevels[level] = { passed: 0, failed: 0 };
      }

      if (result.validation?.passed) {
        skillLevels[level].passed++;
      } else {
        skillLevels[level].failed++;
      }
    }

    const passRate = total > 0 ? (passed / total) * 100 : 0;

    console.log('\nSummary:');
    console.log(`  Total Patterns: ${total}`);
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Pass Rate: ${passRate.toFixed(1)}%`);

    if (failed > 0) {
      console.log('\nFailure Categories:');
      for (const [category, count] of Object.entries(failuresByCategory)) {
        console.log(`  ${category}: ${count}`);
      }

      console.log('\nBy Skill Level:');
      for (const [level, stats] of Object.entries(skillLevels)) {
        const levelRate =
          stats.passed + stats.failed > 0
            ? ((stats.passed / (stats.passed + stats.failed)) * 100).toFixed(1)
            : 0;
        console.log(
          `  ${level}: ${stats.passed}/${
            stats.passed + stats.failed
          } (${levelRate}%)`,
        );
      }
    }

    if (failed > 0) {
      console.log(`\nRun "bun run qa:report" for detailed report`);
      console.log(`Run "bun run qa:repair [--dry-run]" to fix failures`);
    }
  } catch (error) {
    const processCmd = useNewPatterns
      ? 'bun run qa:process --new'
      : 'bun run qa:process';
    console.error('Error reading QA results:', error);
    console.log(`Run "${processCmd}" to generate QA results.`);
  }
}

function categorizeError(error: string): string {
  const errorLower = error.toLowerCase();

  if (errorLower.includes('import') || errorLower.includes('export'))
    return 'imports';
  if (errorLower.includes('type') || errorLower.includes('typescript'))
    return 'typescript';
  if (errorLower.includes('deprecated') || errorLower.includes('outdated'))
    return 'deprecated';
  if (errorLower.includes('example') || errorLower.includes('demo'))
    return 'examples';
  if (errorLower.includes('documentation') || errorLower.includes('clarity'))
    return 'documentation';
  if (errorLower.includes('metadata') || errorLower.includes('frontmatter'))
    return 'metadata';
  if (errorLower.includes('pattern') || errorLower.includes('best practice'))
    return 'patterns';

  return 'other';
}

// --- MAIN ---
showStatus().catch((error) => {
  console.error('Status check failed:', error);
  process.exit(1);
});
