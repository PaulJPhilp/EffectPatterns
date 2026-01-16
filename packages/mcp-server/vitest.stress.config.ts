/**
 * Vitest configuration for stress testing
 * Designed for sequential execution with higher timeouts and memory limits
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Include stress tests from tests/stress directory
    include: ['tests/stress/**/*-test.ts', 'tests/stress/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],

    // Stress tests need extended timeouts
    // Endurance tests can run 30+ minutes, so set timeout to 35 minutes
    testTimeout: 2_100_000, // 35 minutes per test
    hookTimeout: 120_000, // 2 minutes for setup/teardown

    // Run tests sequentially for accurate metrics
    // Running in parallel would interfere with measurements
    fileParallelism: false,

    // Reporting
    reporters: ['default', 'json'],
    outputFile: {
      json: 'tests/stress/reports/results.json',
    },

    // Silence some noise but keep important output
  },
});
