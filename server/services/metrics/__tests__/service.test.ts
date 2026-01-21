/**
 * Metrics service tests
 */

import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { MetricsService } from "server/services/metrics/service.js";

describe("MetricsService", () => {
    it("should track request count", () =>
        Effect.gen(function* () {
            const metrics = yield* MetricsService;

            const initial = metrics.getMetrics();
            expect(initial.requestCount).toBe(0);

            metrics.incrementRequestCount();
            const afterOne = metrics.getMetrics();
            expect(afterOne.requestCount).toBe(1);

            metrics.incrementRequestCount();
            const afterTwo = metrics.getMetrics();
            expect(afterTwo.requestCount).toBe(2);
        }).pipe(Effect.provide(MetricsService.Default), Effect.runPromise));

    it("should track error count", () =>
        Effect.gen(function* () {
            const metrics = yield* MetricsService;

            const initial = metrics.getMetrics();
            expect(initial.errorCount).toBe(0);

            metrics.incrementErrorCount();
            const afterOne = metrics.getMetrics();
            expect(afterOne.errorCount).toBe(1);
        }).pipe(Effect.provide(MetricsService.Default), Effect.runPromise));

    it("should track rate limit hits", () =>
        Effect.gen(function* () {
            const metrics = yield* MetricsService;

            const initial = metrics.getMetrics();
            expect(initial.rateLimitHits).toBe(0);

            metrics.incrementRateLimitHits();
            const afterOne = metrics.getMetrics();
            expect(afterOne.rateLimitHits).toBe(1);
        }).pipe(Effect.provide(MetricsService.Default), Effect.runPromise));

    it("should update health check timestamp", () =>
        Effect.gen(function* () {
            const metrics = yield* MetricsService;

            const initial = metrics.getMetrics();
            const initialHealthCheck = initial.lastHealthCheck;

            // Wait a bit to ensure different timestamp
            yield* Effect.sleep(10);

            metrics.updateHealthCheck();
            const updated = metrics.getMetrics();
            expect(updated.lastHealthCheck).toBeGreaterThan(initialHealthCheck);
        }).pipe(Effect.provide(MetricsService.Default), Effect.runPromise));

    it("should calculate uptime correctly", () =>
        Effect.gen(function* () {
            const metrics = yield* MetricsService;

            const result = metrics.getMetrics();
            expect(result.uptime).toBeGreaterThanOrEqual(0);
            expect(result.healthCheckAge).toBeGreaterThanOrEqual(0);
        }).pipe(Effect.provide(MetricsService.Default), Effect.runPromise));
});
