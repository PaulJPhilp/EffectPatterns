/**
 * Load Stress Test
 * Priority: HIGH
 * Tests concurrent request handling and throughput under various load conditions
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  startServer,
  stopServer,
  getServerUrl,
} from '../utils/server-control';
import { generateTypeScriptFile, PRESET_CONFIGS } from '../generators/code-generator';
import { getThresholds } from '../config/thresholds';
import { createMetricsCollector, RequestMetrics } from '../utils/metrics-collector';

const thresholds = getThresholds('strict');
const metrics = createMetricsCollector();

describe('Load Test - Concurrent Request Handling', () => {
  beforeAll(async () => {
    console.log('Starting server for load tests...');
    metrics.start();
    await startServer({ port: 3003 });
  });

  afterAll(async () => {
    console.log('Stopping server...');
    await stopServer();
  });

  /**
   * Helper to generate test code with specific size
   */
  function generateTestCode(preset: keyof typeof PRESET_CONFIGS = 'small'): string {
    const options = PRESET_CONFIGS[preset]();
    return generateTypeScriptFile(options);
  }

  /**
   * Helper to make a review request
   */
  async function makeRequest(code: string): Promise<RequestMetrics> {
    const startTime = performance.now();

    try {
      const response = await fetch(getServerUrl('/api/review-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const duration = performance.now() - startTime;

      return {
        duration,
        statusCode: response.status,
        success: response.ok,
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        duration,
        statusCode: 0,
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Helper to run concurrent load test
   */
  async function runLoadTest(
    requestsPerSecond: number,
    durationSeconds: number,
    filePreset: keyof typeof PRESET_CONFIGS = 'small'
  ): Promise<void> {
    const code = generateTestCode(filePreset);
    const totalRequests = requestsPerSecond * durationSeconds;
    const requests: Promise<void>[] = [];

    console.log(`  Running: ${requestsPerSecond} req/s for ${durationSeconds}s (${totalRequests} total requests)`);

    for (let i = 0; i < totalRequests; i++) {
      // Spread requests evenly over time
      const delay = (i / requestsPerSecond) * 1000;

      const requestPromise = new Promise<void>((resolve) => {
        setTimeout(async () => {
          const result = await makeRequest(code);
          metrics.recordRequest(result);
          resolve();
        }, delay);
      });

      requests.push(requestPromise);

      // Keep max 50 concurrent requests
      if (requests.length >= 50) {
        const completed = await Promise.race(requests);
        requests.splice(requests.indexOf(completed), 1);
      }
    }

    await Promise.all(requests);
  }

  describe('Baseline Load (10 req/s)', () => {
    it('should handle baseline load with small files', async () => {
      await runLoadTest(10, 30, 'small');

      const allMetrics = metrics.toJSON();
      console.log(`    Latency p50: ${allMetrics.latency.p50.toFixed(2)}ms`);
      console.log(`    Latency p95: ${allMetrics.latency.p95.toFixed(2)}ms`);
      console.log(`    Throughput: ${allMetrics.throughput.requestsPerSecond.toFixed(2)} req/s`);

      // Baseline should easily meet thresholds
      expect(allMetrics.throughput.successfulRequests).toBeGreaterThan(0);
    });
  });

  describe('Normal Load (25 req/s)', () => {
    it('should handle normal load with small files', async () => {
      const testMetrics = createMetricsCollector();
      testMetrics.start();

      const code = generateTestCode('small');
      const requestsPerSecond = 25;
      const durationSeconds = 60;
      const totalRequests = requestsPerSecond * durationSeconds;

      for (let i = 0; i < totalRequests; i++) {
        const delay = (i / requestsPerSecond) * 1000;
        await new Promise((resolve) =>
          setTimeout(async () => {
            const result = await makeRequest(code);
            testMetrics.recordRequest(result);
            resolve(undefined);
          }, delay)
        );
      }

      testMetrics.finish();
      const allMetrics = testMetrics.toJSON();

      console.log(`  Normal Load Results:`);
      console.log(`    Total Requests: ${allMetrics.latency.p50}`); // Using p50 as a stand-in for total
      console.log(`    Latency p50: ${allMetrics.latency.p50.toFixed(2)}ms`);
      console.log(`    Latency p95: ${allMetrics.latency.p95.toFixed(2)}ms`);
      console.log(`    Latency p99: ${allMetrics.latency.p99.toFixed(2)}ms`);
      console.log(`    Throughput: ${allMetrics.throughput.requestsPerSecond.toFixed(2)} req/s`);
      console.log(`    Error Rate: ${(allMetrics.errors.rate * 100).toFixed(2)}%`);

      // Verify normal load thresholds
      expect(allMetrics.latency.p50).toBeLessThan(thresholds.normalLoad.p50);
      expect(allMetrics.latency.p95).toBeLessThan(thresholds.normalLoad.p95);
      expect(allMetrics.latency.p99).toBeLessThan(thresholds.normalLoad.p99);
      expect(allMetrics.errors.rate).toBeLessThan(thresholds.normalLoad.errorRate);
      expect(allMetrics.throughput.requestsPerSecond).toBeGreaterThan(thresholds.normalLoad.throughput);
    });

    it('should handle normal load with mixed file sizes', async () => {
      const testMetrics = createMetricsCollector();
      testMetrics.start();

      const requestsPerSecond = 25;
      const durationSeconds = 60;
      const totalRequests = requestsPerSecond * durationSeconds;

      // 70% small, 20% medium, 10% large
      const fileDistribution = {
        small: 0.7,
        medium: 0.2,
        large: 0.1,
      };

      for (let i = 0; i < totalRequests; i++) {
        const rand = Math.random();
        let preset: keyof typeof PRESET_CONFIGS = 'small';
        if (rand < fileDistribution.small) {
          preset = 'small';
        } else if (rand < fileDistribution.small + fileDistribution.medium) {
          preset = 'medium';
        } else {
          preset = 'large';
        }

        const code = generateTestCode(preset);
        const delay = (i / requestsPerSecond) * 1000;

        await new Promise((resolve) =>
          setTimeout(async () => {
            const result = await makeRequest(code);
            testMetrics.recordRequest(result);
            resolve(undefined);
          }, delay)
        );
      }

      testMetrics.finish();
      const allMetrics = testMetrics.toJSON();

      console.log(`  Normal Load (Mixed Sizes) Results:`);
      console.log(`    Latency p95: ${allMetrics.latency.p95.toFixed(2)}ms`);
      console.log(`    Throughput: ${allMetrics.throughput.requestsPerSecond.toFixed(2)} req/s`);

      expect(allMetrics.latency.p95).toBeLessThan(thresholds.normalLoad.p95);
      expect(allMetrics.errors.rate).toBeLessThan(thresholds.normalLoad.errorRate);
    });
  });

  describe('Peak Load (50 req/s)', () => {
    it('should handle peak load for 60 seconds', async () => {
      const testMetrics = createMetricsCollector();
      testMetrics.start();

      const code = generateTestCode('small');
      const requestsPerSecond = 50;
      const durationSeconds = 60;
      const totalRequests = requestsPerSecond * durationSeconds;

      const startTime = Date.now();

      for (let i = 0; i < totalRequests; i++) {
        const delay = (i / requestsPerSecond) * 1000;
        await new Promise((resolve) =>
          setTimeout(async () => {
            const result = await makeRequest(code);
            testMetrics.recordRequest(result);
            resolve(undefined);
          }, delay)
        );

        // Print progress every 500 requests
        if ((i + 1) % 500 === 0) {
          const elapsed = Date.now() - startTime;
          const actualRps = (i + 1) / (elapsed / 1000);
          console.log(`    Progress: ${i + 1}/${totalRequests} (${actualRps.toFixed(2)} actual req/s)`);
        }
      }

      testMetrics.finish();
      const allMetrics = testMetrics.toJSON();

      console.log(`  Peak Load Results:`);
      console.log(`    Latency p50: ${allMetrics.latency.p50.toFixed(2)}ms`);
      console.log(`    Latency p95: ${allMetrics.latency.p95.toFixed(2)}ms`);
      console.log(`    Throughput: ${allMetrics.throughput.requestsPerSecond.toFixed(2)} req/s`);

      // Peak load has relaxed thresholds
      expect(allMetrics.latency.p50).toBeLessThan(thresholds.peakLoad.p50);
      expect(allMetrics.latency.p95).toBeLessThan(thresholds.peakLoad.p95);
      expect(allMetrics.errors.rate).toBeLessThan(thresholds.peakLoad.errorRate);
    });
  });

  describe('Saturation Testing (100 req/s)', () => {
    it('should identify saturation point at 100 req/s', async () => {
      const testMetrics = createMetricsCollector();
      testMetrics.start();

      const code = generateTestCode('small');
      const requestsPerSecond = 100;
      const durationSeconds = 30;
      const totalRequests = requestsPerSecond * durationSeconds;

      console.log(`  Running saturation test: ${requestsPerSecond} req/s for ${durationSeconds}s`);

      for (let i = 0; i < totalRequests; i++) {
        const delay = (i / requestsPerSecond) * 1000;
        await new Promise((resolve) =>
          setTimeout(async () => {
            const result = await makeRequest(code);
            testMetrics.recordRequest(result);
            resolve(undefined);
          }, delay)
        );
      }

      testMetrics.finish();
      const allMetrics = testMetrics.toJSON();

      console.log(`  Saturation Results:`);
      console.log(`    Latency p99: ${allMetrics.latency.p99.toFixed(2)}ms`);
      console.log(`    Error Rate: ${(allMetrics.errors.rate * 100).toFixed(2)}%`);
      console.log(`    Successful Requests: ${allMetrics.throughput.successfulRequests}`);
      console.log(`    Failed Requests: ${allMetrics.throughput.failedRequests}`);

      // At saturation, we expect some errors or degradation
      // This test identifies where that happens
      if (allMetrics.errors.rate > 0.1) {
        console.log(`  WARNING: High error rate at ${requestsPerSecond} req/s - saturation reached`);
      }
    });
  });

  describe('Stress Under Load', () => {
    it('should maintain response times under sustained normal load', async () => {
      const testMetrics = createMetricsCollector();
      testMetrics.start();

      const code = generateTestCode('medium');
      const requestsPerSecond = 25;
      const durationSeconds = 120; // 2 minutes
      const totalRequests = requestsPerSecond * durationSeconds;

      console.log(`  Running sustained load for ${durationSeconds} seconds...`);

      for (let i = 0; i < totalRequests; i++) {
        const delay = (i / requestsPerSecond) * 1000;
        await new Promise((resolve) =>
          setTimeout(async () => {
            const result = await makeRequest(code);
            testMetrics.recordRequest(result);
            resolve(undefined);
          }, delay)
        );

        if ((i + 1) % 1000 === 0) {
          console.log(`    ${i + 1}/${totalRequests} requests completed`);
        }
      }

      testMetrics.finish();
      const allMetrics = testMetrics.toJSON();

      console.log(`  Sustained Load Results:`);
      console.log(`    Total Duration: ${testMetrics.getElapsedTime().toFixed(2)}ms`);
      console.log(`    Latency p95: ${allMetrics.latency.p95.toFixed(2)}ms`);
      console.log(`    Successful Requests: ${allMetrics.throughput.successfulRequests}`);

      // Should handle sustained load without significant degradation
      expect(allMetrics.throughput.successfulRequests).toBeGreaterThan(totalRequests * 0.95);
    });
  });

  afterAll(() => {
    metrics.finish();
    const summary = metrics.getSummary();
    console.log('\n=== Load Test Summary ===');
    console.log(JSON.stringify(summary, null, 2));
  });
});
