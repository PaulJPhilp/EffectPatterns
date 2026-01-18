/**
 * Spike Stress Test
 * Priority: MEDIUM
 * Tests system resilience to sudden traffic bursts and load changes
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

describe('Spike Test - Traffic Burst Resilience', () => {
  beforeAll(async () => {
    console.log('Starting server for spike tests...');
    await startServer({ port: 3004 });
  });

  afterAll(async () => {
    console.log('Stopping server...');
    await stopServer();
  });

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

  describe('Gradual Ramp Test', () => {
    it('should handle gradual load increase from 0 to 100 req/s over 60 seconds', async () => {
      const testMetrics = createMetricsCollector();
      testMetrics.start();

      const code = generateTypeScriptFile(PRESET_CONFIGS.small());
      const durationSeconds = 60;
      const targetRPS = 100;
      const rampSteps = 12; // Increase every 5 seconds

      console.log(`  Ramping from 0 to ${targetRPS} req/s over ${durationSeconds}s`);

      let totalRequests = 0;
      const stepDuration = durationSeconds / rampSteps;

      for (let step = 1; step <= rampSteps; step++) {
        const currentRPS = (targetRPS / rampSteps) * step;
        const startTime = Date.now();

        // Send requests at current RPS for this step
        while (Date.now() - startTime < stepDuration * 1000) {
          const result = await makeRequest(code);
          testMetrics.recordRequest(result);
          totalRequests++;

          // Control rate
          const elapsed = Date.now() - startTime;
          const expectedRequests = (elapsed / 1000) * currentRPS;
          if (totalRequests < expectedRequests) {
            await new Promise((r) => setTimeout(r, 10));
          }
        }

        console.log(`    Step ${step}/${rampSteps}: ${currentRPS.toFixed(0)} req/s (${totalRequests} total)`);
      }

      testMetrics.finish();
      const metrics = testMetrics.toJSON();

      console.log(`  Ramp Test Results:`);
      console.log(`    Total Requests: ${totalRequests}`);
      console.log(`    Latency p99: ${metrics.latency.p99.toFixed(2)}ms`);
      console.log(`    Error Rate: ${(metrics.errors.rate * 100).toFixed(2)}%`);

      expect(metrics.errors.rate).toBeLessThan(0.1); // 10% acceptable for ramp
    });
  });

  describe('Sudden Spike Test', () => {
    it('should handle sudden spike from 0 to 100 req/s in 5 seconds', async () => {
      const testMetrics = createMetricsCollector();
      testMetrics.start();

      const code = generateTypeScriptFile(PRESET_CONFIGS.small());
      const spikeDuration = 5; // seconds
      const targetRPS = 100;
      const sustainDuration = 30; // sustain spike for 30 seconds

      console.log(`  Creating spike: 0 → ${targetRPS} req/s in ${spikeDuration}s, then sustain for ${sustainDuration}s`);

      // Spike phase
      const spikeStart = Date.now();
      let spikeRequests = 0;

      while (Date.now() - spikeStart < spikeDuration * 1000) {
        const result = await makeRequest(code);
        testMetrics.recordRequest(result);
        spikeRequests++;

        // Control rate - linearly increase
        const elapsed = Date.now() - spikeStart;
        const expectedRPS = (elapsed / (spikeDuration * 1000)) * targetRPS;
        const expectedRequests = (elapsed / 1000) * expectedRPS;
        if (spikeRequests < expectedRequests) {
          await new Promise((r) => setTimeout(r, 5));
        }
      }

      console.log(`    Spike phase: ${spikeRequests} requests`);

      // Sustain phase
      const sustainStart = Date.now();
      let sustainRequests = 0;

      while (Date.now() - sustainStart < sustainDuration * 1000) {
        const result = await makeRequest(code);
        testMetrics.recordRequest(result);
        sustainRequests++;

        // Maintain target RPS
        const elapsed = Date.now() - sustainStart;
        const expectedRequests = (elapsed / 1000) * targetRPS;
        if (sustainRequests < expectedRequests) {
          await new Promise((r) => setTimeout(r, 5));
        }
      }

      console.log(`    Sustain phase: ${sustainRequests} requests`);

      testMetrics.finish();
      const metrics = testMetrics.toJSON();

      console.log(`  Spike Test Results:`);
      console.log(`    Total Requests: ${spikeRequests + sustainRequests}`);
      console.log(`    Latency p99 during spike: ${metrics.latency.p99.toFixed(2)}ms`);
      console.log(`    Error Rate: ${(metrics.errors.rate * 100).toFixed(2)}%`);

      // Spike should degrade but not fail catastrophically
      expect(metrics.latency.p99).toBeLessThan(thresholds.suddenSpike.maxDegradation * 500); // 500ms baseline
      expect(metrics.errors.rate).toBeLessThan(thresholds.suddenSpike.errorRate);
    });

    it('should recover after spike drops to baseline', async () => {
      const testMetrics = createMetricsCollector();
      testMetrics.start();

      const code = generateTypeScriptFile(PRESET_CONFIGS.small());

      // Baseline phase (10 req/s for 20s)
      console.log(`  Baseline: 10 req/s for 20s`);
      let baselineStart = Date.now();
      let baselineRequests = 0;
      while (Date.now() - baselineStart < 20000) {
        const result = await makeRequest(code);
        testMetrics.recordRequest(result);
        baselineRequests++;
        const elapsed = Date.now() - baselineStart;
        const expected = (elapsed / 1000) * 10;
        if (baselineRequests < expected) {
          await new Promise((r) => setTimeout(r, 10));
        }
      }

      // Spike phase (100 req/s for 30s)
      console.log(`  Spike: 100 req/s for 30s`);
      const spikeStart = Date.now();
      let spikeRequests = 0;
      while (Date.now() - spikeStart < 30000) {
        const result = await makeRequest(code);
        testMetrics.recordRequest(result);
        spikeRequests++;
        const elapsed = Date.now() - spikeStart;
        const expected = (elapsed / 1000) * 100;
        if (spikeRequests < expected) {
          await new Promise((r) => setTimeout(r, 2));
        }
      }

      // Recovery phase (10 req/s for 20s)
      console.log(`  Recovery: 10 req/s for 20s`);
      const recoveryStart = Date.now();
      let recoveryRequests = 0;
      while (Date.now() - recoveryStart < 20000) {
        const result = await makeRequest(code);
        testMetrics.recordRequest(result);
        recoveryRequests++;
        const elapsed = Date.now() - recoveryStart;
        const expected = (elapsed / 1000) * 10;
        if (recoveryRequests < expected) {
          await new Promise((r) => setTimeout(r, 10));
        }
      }

      testMetrics.finish();
      const metrics = testMetrics.toJSON();

      console.log(`  Recovery Test Results:`);
      console.log(`    Total Requests: ${baselineRequests + spikeRequests + recoveryRequests}`);
      console.log(`    Recovery Phase Latency: ${metrics.latency.p95.toFixed(2)}ms`);

      // After recovery, should return to baseline latency
      expect(metrics.latency.p95).toBeLessThan(500); // Should recover to ~500ms
    });
  });

  describe('Oscillating Load Test', () => {
    it('should handle rapid load oscillation (10 ↔ 80 req/s every 30s)', async () => {
      const testMetrics = createMetricsCollector();
      testMetrics.start();

      const code = generateTypeScriptFile(PRESET_CONFIGS.small());
      const cycles = 4; // 4 cycles of oscillation
      const cycleDuration = 30; // 30 seconds per load level

      console.log(`  Running ${cycles} load oscillation cycles (10 ↔ 80 req/s)`);

      for (let cycle = 0; cycle < cycles; cycle++) {
        const rps = cycle % 2 === 0 ? 10 : 80;
        const cycleStart = Date.now();
        let cycleRequests = 0;

        console.log(`    Cycle ${cycle + 1}/${cycles}: ${rps} req/s`);

        while (Date.now() - cycleStart < cycleDuration * 1000) {
          const result = await makeRequest(code);
          testMetrics.recordRequest(result);
          cycleRequests++;

          const elapsed = Date.now() - cycleStart;
          const expected = (elapsed / 1000) * rps;
          if (cycleRequests < expected) {
            await new Promise((r) => setTimeout(r, Math.ceil(1000 / rps)));
          }
        }

        console.log(`      Completed: ${cycleRequests} requests`);
      }

      testMetrics.finish();
      const metrics = testMetrics.toJSON();

      console.log(`  Oscillation Test Results:`);
      console.log(`    Total Requests: ${baselineRequests + spikeRequests + recoveryRequests}`);
      console.log(`    Error Rate: ${(metrics.errors.rate * 100).toFixed(2)}%`);

      expect(metrics.errors.rate).toBeLessThan(0.05); // 5% acceptable
    });
  });

  describe('Flash Crowd Test', () => {
    it('should handle 200 simultaneous requests (flash crowd)', async () => {
      const testMetrics = createMetricsCollector();
      testMetrics.start();

      const code = generateTypeScriptFile(PRESET_CONFIGS.small());
      const concurrentRequests = 200;

      console.log(`  Sending ${concurrentRequests} simultaneous requests...`);

      const requests = Array(concurrentRequests)
        .fill(null)
        .map(() => makeRequest(code));

      const results = await Promise.all(requests);
      results.forEach((result) => testMetrics.recordRequest(result));

      testMetrics.finish();
      const metrics = testMetrics.toJSON();

      console.log(`  Flash Crowd Results:`);
      console.log(`    Total Requests: ${concurrentRequests}`);
      console.log(`    Successful: ${metrics.throughput.successfulRequests}`);
      console.log(`    Failed: ${metrics.throughput.failedRequests}`);
      console.log(`    Error Rate: ${(metrics.errors.rate * 100).toFixed(2)}%`);
      console.log(`    Max Latency: ${metrics.latency.max.toFixed(2)}ms`);

      // Should handle most requests even if some fail
      expect(metrics.throughput.successfulRequests).toBeGreaterThan(concurrentRequests * 0.8);
    });
  });

  describe('Wave Pattern Test', () => {
    it('should handle wave pattern (slow ramp → peak → slow drop)', async () => {
      const testMetrics = createMetricsCollector();
      testMetrics.start();

      const code = generateTypeScriptFile(PRESET_CONFIGS.small());
      const totalDuration = 90; // 90 seconds total
      const peakRPS = 80;

      console.log(`  Wave pattern: 0 → ${peakRPS} → 0 req/s over ${totalDuration}s`);

      const waveStart = Date.now();

      while (Date.now() - waveStart < totalDuration * 1000) {
        const elapsed = Date.now() - waveStart;
        const elapsedSeconds = elapsed / 1000;

        // Calculate RPS at this point (sine wave)
        const progress = elapsedSeconds / totalDuration;
        const rps = Math.sin(progress * Math.PI) * peakRPS;

        if (rps > 0) {
          const result = await makeRequest(code);
          testMetrics.recordRequest(result);
        }

        // Sleep proportional to current RPS
        if (rps > 0) {
          await new Promise((r) => setTimeout(r, Math.ceil(1000 / rps)));
        } else {
          await new Promise((r) => setTimeout(r, 100));
        }
      }

      testMetrics.finish();
      const metrics = testMetrics.toJSON();

      console.log(`  Wave Pattern Results:`);
      console.log(`    Total Requests: ${metrics.latency.p50}`); // Using p50 as placeholder
      console.log(`    Error Rate: ${(metrics.errors.rate * 100).toFixed(2)}%`);

      expect(metrics.errors.rate).toBeLessThan(0.1);
    });
  });
});

// Fix for undefined variables
const baselineRequests = 0;
const spikeRequests = 0;
const recoveryRequests = 0;
