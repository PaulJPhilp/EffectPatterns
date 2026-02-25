/**
 * Generates formatted reports from stress test results
 * Supports console output and file export (JSON, HTML)
 */

import { CalculatedMetrics } from './metrics-collector';
import { Thresholds } from '../config/thresholds';
import fs from 'fs';
import path from 'path';

export interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  metrics?: CalculatedMetrics;
  thresholds?: Thresholds;
  checks: CheckResult[];
  duration: number;
  timestamp: Date;
}

export interface CheckResult {
  name: string;
  passed: boolean;
  actual: number | string;
  threshold?: number | string;
  unit?: string;
}

/**
 * Report generator with multiple output formats
 */
export class ReportGenerator {
  private results: TestResult[] = [];

  addResult(result: TestResult): void {
    this.results.push(result);
  }

  /**
   * Generate console report with colored output
   */
  toConsole(): void {
    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║   review_code Stress Test Report - ' + new Date().toISOString().split('T')[0] + '    ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');

    let passCount = 0;
    let failCount = 0;
    let warningCount = 0;

    for (const result of this.results) {
      const status = result.status === 'pass' ? '✓' : result.status === 'fail' ? '✗' : '⚠';
      const statusColor = result.status === 'pass' ? '\x1b[32m' : result.status === 'fail' ? '\x1b[31m' : '\x1b[33m';
      const reset = '\x1b[0m';

      console.log(`${statusColor}${status} ${result.name}${reset}`);

      for (const check of result.checks) {
        const checkStatus = check.passed ? '  ✓' : '  ✗';
        const checkColor = check.passed ? '\x1b[32m' : '\x1b[31m';
        console.log(
          `${checkColor}${checkStatus} ${check.name}: ${check.actual}${check.unit ? check.unit : ''}${reset}` +
            (check.threshold !== undefined ? ` (threshold: ${check.threshold}${check.unit ? check.unit : ''})` : '')
        );
      }

      console.log();

      if (result.status === 'pass') passCount++;
      else if (result.status === 'fail') failCount++;
      else warningCount++;
    }

    console.log('╔═══════════════════════════════════════════════════╗');
    console.log(`║ Summary: ${passCount} passed, ${failCount} failed, ${warningCount} warnings${' '.repeat(Math.max(0, 16 - String(passCount + failCount + warningCount).length))} ║`);
    console.log('╚═══════════════════════════════════════════════════╝\n');

    if (failCount === 0) {
      console.log('✓ All critical tests passed!\n');
    } else {
      console.log(`✗ ${failCount} critical test(s) failed!\n`);
    }
  }

  /**
   * Generate JSON report
   */
  toJSON(pretty: boolean = true): string {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        passed: this.results.filter((r) => r.status === 'pass').length,
        failed: this.results.filter((r) => r.status === 'fail').length,
        warnings: this.results.filter((r) => r.status === 'warning').length,
      },
      results: this.results.map((r) => ({
        name: r.name,
        status: r.status,
        duration: r.duration,
        checks: r.checks,
        metrics: r.metrics ? this.metricsToJSON(r.metrics) : undefined,
      })),
    };

    return pretty ? JSON.stringify(report, null, 2) : JSON.stringify(report);
  }

  /**
   * Generate HTML report
   */
  toHTML(): string {
    const css = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; background: #f5f5f5; }
      .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
      .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
      .summary-card { background: #f8f9fa; padding: 15px; border-radius: 4px; border-left: 4px solid; }
      .summary-card.passed { border-color: #28a745; }
      .summary-card.failed { border-color: #dc3545; }
      .summary-card.warning { border-color: #ffc107; }
      .summary-card > div:first-child { font-size: 24px; font-weight: bold; }
      .summary-card > div:last-child { color: #666; font-size: 12px; }
      .test-result { margin: 20px 0; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; }
      .test-result.pass { border-left: 4px solid #28a745; }
      .test-result.fail { border-left: 4px solid #dc3545; }
      .test-result.warning { border-left: 4px solid #ffc107; }
      .test-header { padding: 15px; background: #f8f9fa; font-weight: bold; display: flex; justify-content: space-between; }
      .test-content { padding: 15px; }
      .check { padding: 8px 0; display: flex; justify-content: space-between; }
      .check.pass { color: #28a745; }
      .check.fail { color: #dc3545; }
      .metric { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
      .metric-item { background: #f8f9fa; padding: 10px; border-radius: 4px; }
      .metric-label { color: #666; font-size: 12px; }
      .metric-value { font-size: 18px; font-weight: bold; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #f8f9fa; padding: 10px; text-align: left; font-weight: bold; border-bottom: 1px solid #ddd; }
      td { padding: 10px; border-bottom: 1px solid #eee; }
      tr:hover { background: #f8f9fa; }
    </style>
    `;

    const timestamp = new Date().toISOString().split('T')[0];
    const summary = {
      total: this.results.length,
      passed: this.results.filter((r) => r.status === 'pass').length,
      failed: this.results.filter((r) => r.status === 'fail').length,
      warnings: this.results.filter((r) => r.status === 'warning').length,
    };

    let resultsHTML = '';
    for (const result of this.results) {
      const checksHTML = result.checks
        .map(
          (check) =>
            `<div class="check ${check.passed ? 'pass' : 'fail'}">
        <span>${check.passed ? '✓' : '✗'} ${check.name}</span>
        <span>${check.actual}${check.unit ? check.unit : ''}${check.threshold ? ` / ${check.threshold}${check.unit ? check.unit : ''}` : ''}</span>
      </div>`
        )
        .join('');

      const metricsHTML = result.metrics
        ? `<div class="metric">
        <div class="metric-item">
          <div class="metric-label">Latency p95</div>
          <div class="metric-value">${result.metrics.latency.p95.toFixed(0)}ms</div>
        </div>
        <div class="metric-item">
          <div class="metric-label">Throughput</div>
          <div class="metric-value">${result.metrics.throughput.requestsPerSecond.toFixed(1)} req/s</div>
        </div>
        <div class="metric-item">
          <div class="metric-label">Error Rate</div>
          <div class="metric-value">${(result.metrics.errors.rate * 100).toFixed(1)}%</div>
        </div>
      </div>`
        : '';

      resultsHTML += `
      <div class="test-result ${result.status}">
        <div class="test-header">
          <span>${result.status === 'pass' ? '✓' : result.status === 'fail' ? '✗' : '⚠'} ${result.name}</span>
          <span>${(result.duration / 1000).toFixed(1)}s</span>
        </div>
        <div class="test-content">
          ${checksHTML}
          ${metricsHTML}
        </div>
      </div>
      `;
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Stress Test Report</title>
      ${css}
    </head>
    <body>
      <div class="container">
        <h1>review_code Stress Test Report - ${timestamp}</h1>

        <div class="summary">
          <div class="summary-card passed">
            <div>${summary.passed}</div>
            <div>Tests Passed</div>
          </div>
          <div class="summary-card failed">
            <div>${summary.failed}</div>
            <div>Tests Failed</div>
          </div>
          <div class="summary-card warning">
            <div>${summary.warnings}</div>
            <div>Tests with Warnings</div>
          </div>
          <div class="summary-card">
            <div>${summary.total}</div>
            <div>Total Tests</div>
          </div>
        </div>

        ${resultsHTML}
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Save report to file
   */
  save(outputDir: string = 'tests/stress/reports'): void {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Save JSON
    const jsonPath = path.join(outputDir, `report-${timestamp}.json`);
    fs.writeFileSync(jsonPath, this.toJSON(true));
    console.log(`Saved JSON report: ${jsonPath}`);

    // Save HTML
    const htmlPath = path.join(outputDir, `report-${timestamp}.html`);
    fs.writeFileSync(htmlPath, this.toHTML());
    console.log(`Saved HTML report: ${htmlPath}`);

    // Save latest symlink (if on Unix)
    if (process.platform !== 'win32') {
      const latestLink = path.join(outputDir, 'latest.json');
      try {
        fs.unlinkSync(latestLink);
      } catch (e) {
        // Ignore if not exists
      }
      fs.symlinkSync(path.basename(jsonPath), latestLink);
    }
  }

  private metricsToJSON(metrics: CalculatedMetrics): object {
    return {
      latency: {
        p50: metrics.latency.p50.toFixed(2),
        p95: metrics.latency.p95.toFixed(2),
        p99: metrics.latency.p99.toFixed(2),
      },
      throughput: metrics.throughput.requestsPerSecond.toFixed(2),
      errorRate: (metrics.errors.rate * 100).toFixed(2) + '%',
      memory: {
        growth: (metrics.resources.memoryGrowth / 1024 / 1024).toFixed(2) + 'MB',
      },
    };
  }
}

/**
 * Create a report generator instance
 */
export function createReportGenerator(): ReportGenerator {
  return new ReportGenerator();
}
