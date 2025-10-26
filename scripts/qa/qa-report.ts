/**
 * qa-report.ts
 *
 * QA report generation script. Aggregates all QA results and generates
 * a comprehensive JSON report with statistics and analysis.
 *
 * Usage:
 *   bun run qa:report [--new]        # Generate report for new patterns (content/new/qa)
 *   bun run qa:report                 # Generate report for published patterns (content/qa)
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
const REPORT_FILE = path.join(QA_DIR, 'qa-report.json');

// --- INTERFACES ---
interface QAReport {
  summary: {
    totalPatterns: number;
    passed: number;
    failed: number;
    passRate: number;
    totalTokens: number;
    totalCost: number;
    averageDuration: number;
    generatedAt: string;
  };
  failures: {
    byCategory: Record<string, number>;
    bySkillLevel: Record<string, { passed: number; failed: number }>;
    byTag: Record<string, { passed: number; failed: number }>;
    patterns: Array<{
      patternId: string;
      fileName: string;
      title: string;
      skillLevel: string;
      tags: string[];
      errors: string[];
      warnings: string[];
      suggestions: string[];
    }>;
  };
  metrics: {
    tokenUsage: {
      min: number;
      max: number;
      average: number;
    };
    costAnalysis: {
      min: number;
      max: number;
      average: number;
      total: number;
    };
    durationStats: {
      min: number;
      max: number;
      average: number;
    };
  };
  recommendations: string[];
}

// --- MAIN PROCESSING ---
async function main() {
  const patternType = useNewPatterns ? 'new patterns' : 'published patterns';
  console.log(`Generating QA report for ${patternType}...`);
  console.log(`Source: ${QA_DIR}`);

  try {
    // Check if results exist
    const files = await fs.readdir(RESULTS_DIR);
    const qaResults = files.filter((f) => f.endsWith('.json'));

    if (qaResults.length === 0) {
      const processCmd = useNewPatterns
        ? 'bun run qa:process --new'
        : 'bun run qa:process';
      console.log(`No QA results found. Run "${processCmd}" first.`);
      return;
    }

    console.log(`Found ${qaResults.length} QA result files`);

    // Load all results
    const results = [];
    for (const file of qaResults) {
      const filePath = path.join(RESULTS_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      results.push(JSON.parse(content));
    }

    // Generate report
    const report = await generateReport(results);

    // Save report
    await fs.writeFile(REPORT_FILE, JSON.stringify(report, null, 2));

    // Display summary
    displaySummary(report);
  } catch (error) {
    console.error('Report generation failed:', error);
    process.exit(1);
  }
}

async function generateReport(results: any[]): Promise<QAReport> {
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  const passRate = total > 0 ? (passed / total) * 100 : 0;

  // Calculate metrics
  const tokens = results.map((r) => r.tokens || 0);
  const costs = results.map((r) => r.cost || 0);
  const durations = results.map((r) => r.duration || 0);

  const totalTokens = tokens.reduce((sum, t) => sum + t, 0);
  const totalCost = costs.reduce((sum, c) => sum + c, 0);
  const totalDuration = durations.reduce((sum, d) => sum + d, 0);

  // Categorize failures
  const failuresByCategory: Record<string, number> = {};
  const failedPatterns = results.filter((r) => !r.passed);

  // Build failure patterns list
  const failurePatterns = failedPatterns.map((result) => ({
    patternId: result.patternId || 'unknown',
    fileName: result.fileName || 'unknown',
    title: result.metadata?.title || 'Unknown',
    skillLevel: result.metadata?.skillLevel || 'unknown',
    tags: result.metadata?.tags || [],
    errors: result.errors || [],
    warnings: result.warnings || [],
    suggestions: result.suggestions || [],
  }));

  // Build skill level stats
  const skillLevelStats: Record<string, { passed: number; failed: number }> =
    {};
  const tagStats: Record<string, { passed: number; failed: number }> = {};

  for (const result of results) {
    const level = result.metadata?.skillLevel || 'unknown';
    if (!skillLevelStats[level]) {
      skillLevelStats[level] = { passed: 0, failed: 0 };
    }

    if (result.passed) {
      skillLevelStats[level].passed++;
    } else {
      skillLevelStats[level].failed++;
    }

    // Tag stats
    const tags = result.metadata?.tags || [];
    for (const tag of tags) {
      if (!tagStats[tag]) {
        tagStats[tag] = { passed: 0, failed: 0 };
      }

      if (result.passed) {
        tagStats[tag].passed++;
      } else {
        tagStats[tag].failed++;
      }
    }
  }

  // Generate recommendations
  const recommendations = generateRecommendations(results, failedPatterns);

  return {
    summary: {
      totalPatterns: total,
      passed,
      failed,
      passRate,
      totalTokens,
      totalCost,
      averageDuration: total > 0 ? totalDuration / total : 0,
      generatedAt: new Date().toISOString(),
    },
    failures: {
      byCategory: failuresByCategory,
      bySkillLevel: skillLevelStats,
      byTag: tagStats,
      patterns: failurePatterns,
    },
    metrics: {
      tokenUsage: {
        min: Math.min(...tokens),
        max: Math.max(...tokens),
        average: total > 0 ? totalTokens / total : 0,
      },
      costAnalysis: {
        min: Math.min(...costs),
        max: Math.max(...costs),
        average: total > 0 ? totalCost / total : 0,
        total: totalCost,
      },
      durationStats: {
        min: Math.min(...durations),
        max: Math.max(...durations),
        average: total > 0 ? totalDuration / total : 0,
      },
    },
    recommendations,
  };
}

function generateRecommendations(
  results: any[],
  failedPatterns: any[],
): string[] {
  const recommendations: string[] = [];

  if (failedPatterns.length > 0) {
    recommendations.push(
      `Found ${failedPatterns.length} failed patterns. Run "bun run qa:repair" to fix them.`,
    );

    // Analyze common issues
    const commonIssues = analyzeCommonIssues(failedPatterns);
    recommendations.push(...commonIssues);
  }

  if (results.length === 0) {
    recommendations.push(
      'No QA results found. Run "bun run qa:process" to generate validation results.',
    );
  }

  return recommendations;
}

function analyzeCommonIssues(failedPatterns: any[]): string[] {
  const issues: string[] = [];

  // Collect all errors
  const allErrors = failedPatterns.flatMap((p) => p.errors || []);

  if (allErrors.length === 0) return issues;

  // Count error types
  const errorCounts: Record<string, number> = {};
  for (const error of allErrors) {
    const type = categorizeError(error);
    errorCounts[type] = (errorCounts[type] || 0) + 1;
  }

  // Generate recommendations based on common issues
  for (const [type, count] of Object.entries(errorCounts)) {
    if (count > 1) {
      issues.push(
        `Multiple patterns have ${type} issues (${count} occurrences). Consider batch fixes.`,
      );
    }
  }

  return issues;
}

function categorizeError(error: string): string {
  const errorLower = error.toLowerCase();

  if (errorLower.includes('import') || errorLower.includes('export'))
    return 'import/export issues';
  if (errorLower.includes('type') || errorLower.includes('typescript'))
    return 'TypeScript errors';
  if (errorLower.includes('deprecated') || errorLower.includes('outdated'))
    return 'deprecated APIs';
  if (errorLower.includes('example') || errorLower.includes('demo'))
    return 'example problems';
  if (errorLower.includes('documentation') || errorLower.includes('clarity'))
    return 'documentation issues';
  if (errorLower.includes('metadata') || errorLower.includes('frontmatter'))
    return 'metadata issues';

  return 'other issues';
}

function displaySummary(report: QAReport) {
  console.log('QA Report Generated');
  console.log('==================');
  console.log(`Total Patterns: ${report.summary.totalPatterns}`);
  console.log(`Passed: ${report.summary.passed}`);
  console.log(`Failed: ${report.summary.failed}`);
  console.log(`Pass Rate: ${report.summary.passRate.toFixed(1)}%`);
  console.log(`Total Cost: $${report.summary.totalCost.toFixed(4)}`);
  console.log(`Total Tokens: ${report.summary.totalTokens}`);

  if (report.failures.patterns.length > 0) {
    console.log(`\nFailed Patterns: ${report.failures.patterns.length}`);
    console.log(`Report saved to: ${REPORT_FILE}`);
    console.log('\nRecommendations:');
    for (const rec of report.recommendations) {
      console.log(`  - ${rec}`);
    }
  }
}

// --- ERROR HANDLING ---
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main().catch((error) => {
  console.error('Report generation failed:', error);
  process.exit(1);
});
