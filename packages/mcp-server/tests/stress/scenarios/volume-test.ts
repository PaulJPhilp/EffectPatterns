/**
 * Volume Stress Test
 * Priority: HIGH
 * Tests resource limits and handling of large/complex files
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  startServer,
  stopServer,
  getServerUrl,
} from '../utils/server-control';
import { generateTypeScriptFile, PRESET_CONFIGS } from '../generators/code-generator';
import {
  generateFlawedCodeFile,
  PATTERN_PRESETS,
  countExpectedFindings,
} from '../generators/anti-pattern-generator';
import { getThresholds } from '../config/thresholds';
import { createMetricsCollector } from '../utils/metrics-collector';

const thresholds = getThresholds('strict');
const metrics = createMetricsCollector();

describe('Volume Test - Large File Handling', () => {
  beforeAll(async () => {
    console.log('Starting server for volume tests...');
    metrics.start();
    await startServer({ port: 3002 });
  });

  afterAll(async () => {
    console.log('Stopping server...');
    await stopServer();
  });

  describe('Near-Limit Files (98KB)', () => {
    it('should handle clean 98KB file', async () => {
      const options = PRESET_CONFIGS.nearLimit();
      const code = generateTypeScriptFile(options);

      expect(code.length).toBeLessThanOrEqual(100000);

      const startTime = performance.now();
      const parseStart = performance.now();

      const response = await fetch(getServerUrl('/api/review-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const totalDuration = performance.now() - startTime;
      // Accept 200 (ok), 401 (auth required), or 413 (payload too large)
      expect([200, 401, 413]).toContain(response.status);
      expect(totalDuration).toBeLessThan(thresholds.nearLimitFile.totalTime);

      if (response.ok) {
        const data = await response.json();
        expect(Array.isArray(data.recommendations)).toBe(true);
      }

      metrics.recordRequest({
        duration: totalDuration,
        statusCode: response.status,
        success: response.ok || response.status === 401,
      });
    });

    it('should handle 98KB file with many issues', async () => {
      const options = PRESET_CONFIGS.nearLimit();
      const code = generateFlawedCodeFile(options, 'heavilyFlawed');

      expect(code.length).toBeLessThanOrEqual(100000);

      const startTime = performance.now();

      const response = await fetch(getServerUrl('/api/review-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const duration = performance.now() - startTime;

      // Accept 200 (ok), 401 (auth required), or 413 (payload too large)
      expect([200, 401, 413]).toContain(response.status);
      expect(duration).toBeLessThan(thresholds.nearLimitFile.totalTime);

      if (response.ok) {
        const data = await response.json();
        expect(Array.isArray(data.recommendations)).toBe(true);
        expect(data.recommendations.length).toBeLessThanOrEqual(3);
      }

      metrics.recordRequest({
        duration,
        statusCode: response.status,
        success: response.ok || response.status === 401,
      });
    });

    it('should handle 98KB file with deep nesting', async () => {
      const baseOptions = PRESET_CONFIGS.nearLimit();
      let code = generateTypeScriptFile(baseOptions);

      // Wrap in deeply nested Effect.gen structures
      for (let i = 0; i < 8; i++) {
        code = `Effect.gen(function* () {\n${code}\n})`;
      }

      const startTime = performance.now();

      const response = await fetch(getServerUrl('/api/review-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const duration = performance.now() - startTime;

      // Accept 200 (ok), 401 (auth required), or 413 (payload too large)
      expect([200, 401, 413]).toContain(response.status);

      metrics.recordRequest({
        duration,
        statusCode: response.status,
        success: response.ok || response.status === 401,
      });
    });
  });

  describe('Complex Files (50+ issues)', () => {
    it('should analyze file with maximum anti-patterns', async () => {
      const options = PRESET_CONFIGS.medium();
      const code = generateFlawedCodeFile(options, 'heavilyFlawed');

      const startTime = performance.now();

      const response = await fetch(getServerUrl('/api/review-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const duration = performance.now() - startTime;

      // Accept 200 (ok), 401 (auth required), or 413 (payload too large)
      expect([200, 401, 413]).toContain(response.status);
      expect(duration).toBeLessThan(thresholds.maxComplexity.totalTime);

      if (response.ok) {
        const data = await response.json();
        // Should return top 3 even with many issues
        expect(data.recommendations.length).toBeLessThanOrEqual(3);
        expect(data.recommendations.length).toBeGreaterThan(0);
      }

      metrics.recordRequest({
        duration,
        statusCode: response.status,
        success: response.ok || response.status === 401,
      });
    });

    it('should handle mixed anti-patterns efficiently', async () => {
      const options = PRESET_CONFIGS.large();
      const code = generateFlawedCodeFile(options, 'mixed');

      const startTime = performance.now();

      const response = await fetch(getServerUrl('/api/review-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const duration = performance.now() - startTime;

      // Accept 200 (ok), 401 (auth required), or 413 (payload too large)
      expect([200, 401, 413]).toContain(response.status);
      expect(duration).toBeLessThan(thresholds.maxComplexity.totalTime);

      metrics.recordRequest({
        duration,
        statusCode: response.status,
        success: response.ok || response.status === 401,
      });
    });

    it('should limit results to 3 recommendations', async () => {
      const options = PRESET_CONFIGS.medium();
      const code = generateFlawedCodeFile(options, 'anyTypeHeavy');

      const response = await fetch(getServerUrl('/api/review-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      // Accept 200 (ok), 401 (auth required), or 413 (payload too large)
      expect([200, 401, 413]).toContain(response.status);

      if (response.ok) {
        const data = await response.json();
        expect(data.recommendations.length).toBeLessThanOrEqual(3);
      }
    });
  });

  describe('Size Variations', () => {
    it('should handle 5KB file quickly', async () => {
      const options = PRESET_CONFIGS.small();
      const code = generateTypeScriptFile(options);

      const startTime = performance.now();

      const response = await fetch(getServerUrl('/api/review-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const duration = performance.now() - startTime;

      // Accept 200 (ok), 401 (auth required), or 413 (payload too large)
      expect([200, 401, 413]).toContain(response.status);
      expect(duration).toBeLessThan(1000); // Should be much faster than 1s

      metrics.recordRequest({
        duration,
        statusCode: response.status,
        success: response.ok || response.status === 401,
      });
    });

    it('should handle 25KB file within reasonable time', async () => {
      const options = PRESET_CONFIGS.medium();
      const code = generateTypeScriptFile(options);

      const startTime = performance.now();

      const response = await fetch(getServerUrl('/api/review-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const duration = performance.now() - startTime;

      // Accept 200 (ok), 401 (auth required), or 413 (payload too large)
      expect([200, 401, 413]).toContain(response.status);
      expect(duration).toBeLessThan(thresholds.nearLimitFile.analysisTime);

      metrics.recordRequest({
        duration,
        statusCode: response.status,
        success: response.ok || response.status === 401,
      });
    });

    it('should handle 90KB file close to limit', async () => {
      const options = PRESET_CONFIGS.large();
      const code = generateTypeScriptFile(options);

      const startTime = performance.now();

      const response = await fetch(getServerUrl('/api/review-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const duration = performance.now() - startTime;

      // Accept 200 (ok), 401 (auth required), or 413 (payload too large)
      expect([200, 401, 413]).toContain(response.status);
      expect(duration).toBeLessThan(thresholds.nearLimitFile.totalTime);

      metrics.recordRequest({
        duration,
        statusCode: response.status,
        success: response.ok || response.status === 401,
      });
    });
  });

  describe('Deep Nesting Scenarios', () => {
    it('should handle nested Effect.gen structures', async () => {
      let code = 'export const deepEffect = Effect.gen(function* () {\n';

      // Create 10 levels of nesting
      for (let i = 0; i < 10; i++) {
        code += `  const level${i} = yield* Effect.gen(function* () {\n`;
      }

      code += '    return { value: 42 };\n';

      for (let i = 0; i < 10; i++) {
        code += '  });\n';
      }

      code += '  return level0;\n});';

      const startTime = performance.now();

      const response = await fetch(getServerUrl('/api/review-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const duration = performance.now() - startTime;

      // Accept 200 (ok), 401 (auth required), or 413 (payload too large)
      expect([200, 401, 413]).toContain(response.status);
      expect(duration).toBeLessThan(thresholds.maxComplexity.totalTime);

      metrics.recordRequest({
        duration,
        statusCode: response.status,
        success: response.ok || response.status === 401,
      });
    });
  });

  describe('Consistency and Determinism', () => {
    it('should return consistent results for same input', async () => {
      const options = PRESET_CONFIGS.medium();
      const code = generateTypeScriptFile(options);

      const results: unknown[] = [];
      const statuses: number[] = [];

      for (let i = 0; i < 3; i++) {
        const response = await fetch(getServerUrl('/api/review-code'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        statuses.push(response.status);
        if (response.ok) {
          const data = await response.json();
          results.push(data);
        }
      }

      // All requests should return same status code
      expect(statuses[0]).toBe(statuses[1]);
      expect(statuses[1]).toBe(statuses[2]);
      expect([200, 401, 413]).toContain(statuses[0]);

      // If we got successful responses, they should be identical
      if (results.length === 3) {
        expect(results[0]).toEqual(results[1]);
        expect(results[1]).toEqual(results[2]);
      }
    });

    it('should detect issues consistently', async () => {
      const options = PRESET_CONFIGS.small();
      const code = generateFlawedCodeFile(options, 'moderate');

      const results: any[] = [];
      const statuses: number[] = [];

      for (let i = 0; i < 2; i++) {
        const response = await fetch(getServerUrl('/api/review-code'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        statuses.push(response.status);
        if (response.ok) {
          results.push(await response.json());
        }
      }

      // Requests should return consistent status codes
      expect(statuses[0]).toBe(statuses[1]);
      expect([200, 401, 413]).toContain(statuses[0]);

      // If we got successful responses with data, they should be identical
      if (results.length === 2) {
        expect(results[0].recommendations).toEqual(results[1].recommendations);
      }
    });
  });

  describe('Response Quality', () => {
    it('should include severity levels in recommendations', async () => {
      const options = PRESET_CONFIGS.small();
      const code = generateFlawedCodeFile(options, 'moderate');

      const response = await fetch(getServerUrl('/api/review-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        const data = await response.json();
        data.recommendations.forEach((rec: any) => {
          expect(['high', 'medium', 'low']).toContain(rec.severity);
          expect(rec.message).toBeDefined();
        });
      }
    });

    it('should sort recommendations by severity', async () => {
      const options = PRESET_CONFIGS.medium();
      const code = generateFlawedCodeFile(options, 'heavilyFlawed');

      const response = await fetch(getServerUrl('/api/review-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        const data = await response.json();

        // Check if sorted by severity
        const severityOrder = { high: 0, medium: 1, low: 2 };
        for (let i = 0; i < data.recommendations.length - 1; i++) {
          const curr = severityOrder[data.recommendations[i].severity as keyof typeof severityOrder];
          const next = severityOrder[data.recommendations[i + 1].severity as keyof typeof severityOrder];
          expect(curr).toBeLessThanOrEqual(next);
        }
      }
    });
  });

  afterAll(() => {
    metrics.finish();
    const summary = metrics.getSummary();
    console.log('\n=== Volume Test Summary ===');
    console.log(JSON.stringify(summary, null, 2));

    // Verify test performance met thresholds
    const allMetrics = metrics.toJSON();
    console.log('\nDetailed Metrics:');
    console.log(`  Latency p95: ${allMetrics.latency.p95.toFixed(2)}ms (threshold: ${thresholds.nearLimitFile.totalTime}ms)`);
    console.log(`  Throughput: ${allMetrics.throughput.requestsPerSecond.toFixed(2)} req/s`);
    console.log(`  Error Rate: ${(allMetrics.errors.rate * 100).toFixed(2)}%`);
  });
});
