/**
 * Endurance Stress Test
 * Priority: MEDIUM
 * Tests long-running stability, memory leaks, and performance degradation
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

describe('Endurance Test - Long-Running Stability', () => {
  beforeAll(async () => {
    console.log('Starting server for endurance tests...');
    await startServer({ port: 3005 });
  });

  afterAll(async () => {
    console.log('Stopping server...');
    await stopServer();
  });

  /**
   * Helper to make a review request and capture memory
   */
  async function makeRequest(code: string): Promise<RequestMetrics> {
    const memBefore = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    try {
      const response = await fetch(getServerUrl('/api/review-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const duration = performance.now() - startTime;
      const memAfter = process.memoryUsage().heapUsed;

      return {
        duration,
        statusCode: response.status,
        success: response.ok,
        memoryBefore: memBefore,
        memoryAfter: memAfter,
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        duration,
        statusCode: 0,
        success: false,
        error: String(error),
        memoryBefore: memBefore,
        memoryAfter: process.memoryUsage().heapUsed,
      };
    }
  }

  describe('Sustained Load Test (10 minutes)', () => {
    it('should maintain performance over 10 minutes at 10 req/s', async () => {
      const testMetrics = createMetricsCollector();
      testMetrics.start();

      const code = generateTypeScriptFile(PRESET_CONFIGS.small());
      const requestsPerSecond = 10;
      const durationMinutes = 10;
      const durationSeconds = durationMinutes * 60;
      const totalRequests = requestsPerSecond * durationSeconds;

      console.log(`  Running sustained load: 10 req/s for ${durationMinutes} minutes (${totalRequests} total requests)`);

      const measurements: { time: number; latency: number; memory: number }[] = [];
      let requestCount = 0;

      const startTime = Date.now();

      for (let i = 0; i < totalRequests; i++) {
        const result = await makeRequest(code);
        testMetrics.recordRequest(result);
        requestCount++;

        // Record metrics every 100 requests
        if (requestCount % 100 === 0) {
          const elapsed = (Date.now() - startTime) / 1000;
          const memory = process.memoryUsage().heapUsed / 1024 / 1024; // Convert to MB
          measurements.push({
            time: elapsed,
            latency: result.duration,
            memory,
          });

          if (requestCount % 1000 === 0) {
            console.log(`    ${requestCount}/${totalRequests} requests (${elapsed.toFixed(0)}s elapsed, ${memory.toFixed(0)}MB memory)`);
          }
        }

        // Control rate
        const elapsed = Date.now() - startTime;
        const expectedRequests = (elapsed / 1000) * requestsPerSecond;
        if (requestCount < expectedRequests) {
          await new Promise((r) => setTimeout(r, 10));
        }
      }

      testMetrics.finish();
      const metrics = testMetrics.toJSON();

      // Analyze metrics over time to detect degradation
      const firstQuarter = measurements.slice(0, Math.floor(measurements.length / 4));
      const lastQuarter = measurements.slice(Math.floor((measurements.length * 3) / 4));

      const firstAvgLatency = firstQuarter.reduce((sum, m) => sum + m.latency, 0) / firstQuarter.length;
      const lastAvgLatency = lastQuarter.reduce((sum, m) => sum + m.latency, 0) / lastQuarter.length;
      const degradation = lastAvgLatency / firstAvgLatency;

      const firstAvgMemory = firstQuarter.reduce((sum, m) => sum + m.memory, 0) / firstQuarter.length;
      const lastAvgMemory = lastQuarter.reduce((sum, m) => sum + m.memory, 0) / lastQuarter.length;
      const memoryGrowth = lastAvgMemory - firstAvgMemory;

      console.log(`  Sustained Load Results:`);
      console.log(`    Total Requests: ${totalRequests}`);
      console.log(`    Successful: ${metrics.throughput.successfulRequests}`);
      console.log(`    Failed: ${metrics.throughput.failedRequests}`);
      console.log(`    Latency Degradation: ${degradation.toFixed(2)}x`);
      console.log(`    Memory Growth: ${memoryGrowth.toFixed(0)}MB`);
      console.log(`    Error Rate: ${(metrics.errors.rate * 100).toFixed(2)}%`);

      expect(degradation).toBeLessThan(thresholds.sustainedLoad.latencyDegradation);
      expect(memoryGrowth / durationMinutes).toBeLessThan(thresholds.sustainedLoad.memoryGrowthRate);
    });
  });

  describe('Memory Leak Detection (30 minutes with same code)', () => {
    it('should not leak memory when analyzing same file repeatedly', async () => {
      const testMetrics = createMetricsCollector();
      testMetrics.start();

      const code = generateTypeScriptFile(PRESET_CONFIGS.medium());
      const requestsPerSecond = 5;
      const durationMinutes = 30;
      const durationSeconds = durationMinutes * 60;
      const totalRequests = requestsPerSecond * durationSeconds;

      console.log(`  Running memory leak detection: Same file, 5 req/s for ${durationMinutes} minutes`);

      const memorySnapshots: { time: number; memory: number }[] = [];
      let requestCount = 0;
      const startTime = Date.now();

      for (let i = 0; i < totalRequests; i++) {
        const result = await makeRequest(code);
        testMetrics.recordRequest(result);
        requestCount++;

        // Snapshot memory every 200 requests
        if (requestCount % 200 === 0) {
          const elapsed = (Date.now() - startTime) / 1000 / 60; // Convert to minutes
          const memory = process.memoryUsage().heapUsed / 1024 / 1024;
          memorySnapshots.push({ time: elapsed, memory });

          if (requestCount % 2000 === 0) {
            console.log(`    ${requestCount}/${totalRequests} requests (${elapsed.toFixed(1)} min, ${memory.toFixed(0)}MB memory)`);
          }
        }

        // Control rate
        const elapsed = Date.now() - startTime;
        const expectedRequests = (elapsed / 1000) * requestsPerSecond;
        if (requestCount < expectedRequests) {
          await new Promise((r) => setTimeout(r, 20));
        }
      }

      testMetrics.finish();

      // Calculate memory trend (linear regression)
      if (memorySnapshots.length >= 2) {
        const n = memorySnapshots.length;
        const sumX = memorySnapshots.reduce((sum, s) => sum + s.time, 0);
        const sumY = memorySnapshots.reduce((sum, s) => sum + s.memory, 0);
        const sumXY = memorySnapshots.reduce((sum, s) => sum + s.time * s.memory, 0);
        const sumX2 = memorySnapshots.reduce((sum, s) => sum + s.time * s.time, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const memoryGrowthRate = slope; // MB per minute

        console.log(`  Memory Leak Detection Results:`);
        console.log(`    Total Requests: ${totalRequests}`);
        console.log(`    Memory Growth Rate: ${memoryGrowthRate.toFixed(2)} MB/min`);
        console.log(`    Initial Memory: ${memorySnapshots[0].memory.toFixed(0)}MB`);
        console.log(`    Final Memory: ${memorySnapshots[n - 1].memory.toFixed(0)}MB`);

        // Check for suspicious memory growth
        expect(Math.abs(memoryGrowthRate)).toBeLessThan(thresholds.sustainedLoad.memoryGrowthRate);
      }
    });
  });

  describe('GC Pressure Test', () => {
    it('should handle high GC pressure without excessive pauses', async () => {
      const testMetrics = createMetricsCollector();
      testMetrics.start();

      const requestsPerSecond = 20; // Faster requests = higher GC pressure
      const durationSeconds = 300; // 5 minutes
      const totalRequests = requestsPerSecond * durationSeconds;

      console.log(`  Running GC pressure test: 20 req/s for 5 minutes (${totalRequests} requests)`);

      let requestCount = 0;
      const startTime = Date.now();
      const pauseDetections: number[] = [];

      for (let i = 0; i < totalRequests; i++) {
        const code = generateTypeScriptFile(PRESET_CONFIGS.small());
        const preRequest = Date.now();

        const result = await makeRequest(code);
        testMetrics.recordRequest(result);
        requestCount++;

        // Check for GC pauses (unusual gap between requests)
        const postRequest = Date.now();
        const actualDuration = postRequest - preRequest;
        const expectedDuration = 1000 / requestsPerSecond;

        if (actualDuration > expectedDuration * 2) {
          pauseDetections.push(actualDuration);
        }

        if (requestCount % 1000 === 0) {
          console.log(`    ${requestCount}/${totalRequests} requests`);
        }

        // Control rate
        const elapsed = Date.now() - startTime;
        const expectedRequests = (elapsed / 1000) * requestsPerSecond;
        if (requestCount < expectedRequests) {
          await new Promise((r) => setTimeout(r, 5));
        }
      }

      testMetrics.finish();
      const metrics = testMetrics.toJSON();

      const avgPauseDuration = pauseDetections.length > 0
        ? pauseDetections.reduce((a, b) => a + b) / pauseDetections.length
        : 0;

      console.log(`  GC Pressure Test Results:`);
      console.log(`    Total Requests: ${totalRequests}`);
      console.log(`    GC Pauses Detected: ${pauseDetections.length}`);
      if (pauseDetections.length > 0) {
        console.log(`    Avg Pause Duration: ${avgPauseDuration.toFixed(0)}ms`);
        console.log(`    Max Pause Duration: ${Math.max(...pauseDetections).toFixed(0)}ms`);
      }
      console.log(`    Error Rate: ${(metrics.errors.rate * 100).toFixed(2)}%`);

      // Allow some GC pauses but not excessive ones
      if (pauseDetections.length > 0) {
        expect(avgPauseDuration).toBeLessThan(thresholds.sustainedLoad.gcPauseDuration * 2);
      }
    });
  });

  describe('Mixed Workload Endurance', () => {
    it('should maintain stability with mixed file sizes over 10 minutes', async () => {
      const testMetrics = createMetricsCollector();
      testMetrics.start();

      const durationSeconds = 600; // 10 minutes
      const requestsPerSecond = 15;
      const totalRequests = durationSeconds * requestsPerSecond;

      console.log(`  Running mixed workload: 15 req/s for 10 min with varying file sizes`);

      // Distribution: 50% small, 30% medium, 20% large
      let requestCount = 0;
      const startTime = Date.now();

      for (let i = 0; i < totalRequests; i++) {
        const rand = Math.random();
        let preset: keyof typeof PRESET_CONFIGS = 'small';

        if (rand < 0.5) {
          preset = 'small';
        } else if (rand < 0.8) {
          preset = 'medium';
        } else {
          preset = 'large';
        }

        const code = generateTypeScriptFile(PRESET_CONFIGS[preset]());
        const result = await makeRequest(code);
        testMetrics.recordRequest(result);
        requestCount++;

        if (requestCount % 1000 === 0) {
          console.log(`    ${requestCount}/${totalRequests} requests`);
        }

        // Control rate
        const elapsed = Date.now() - startTime;
        const expectedRequests = (elapsed / 1000) * requestsPerSecond;
        if (requestCount < expectedRequests) {
          await new Promise((r) => setTimeout(r, 20));
        }
      }

      testMetrics.finish();
      const metrics = testMetrics.toJSON();

      console.log(`  Mixed Workload Results:`);
      console.log(`    Total Requests: ${totalRequests}`);
      console.log(`    Successful: ${metrics.throughput.successfulRequests}`);
      console.log(`    Failed: ${metrics.throughput.failedRequests}`);
      console.log(`    Average Latency: ${metrics.latency.mean.toFixed(2)}ms`);
      console.log(`    Error Rate: ${(metrics.errors.rate * 100).toFixed(2)}%`);

      expect(metrics.throughput.successfulRequests).toBeGreaterThan(totalRequests * 0.95);
    });
  });
});
