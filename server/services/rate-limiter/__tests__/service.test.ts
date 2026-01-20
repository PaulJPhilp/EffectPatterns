/**
 * Rate limiter service tests
 */

import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { RateLimiterService } from "../service.js";

describe("RateLimiterService", () => {
    it("should allow requests within limit", () =>
        Effect.gen(function* () {
            const rateLimiter = yield* RateLimiterService;

            const result1 = yield* rateLimiter.checkRateLimit("127.0.0.1");
            const result2 = yield* rateLimiter.checkRateLimit("127.0.0.1");

            expect(result1.allowed).toBe(true);
            expect(result1.remaining).toBe(99);
            expect(result2.allowed).toBe(true);
            expect(result2.remaining).toBe(98);
        }).pipe(Effect.provide(RateLimiterService.Default), Effect.runPromise));

    it("should block requests exceeding limit", () =>
        Effect.gen(function* () {
            const rateLimiter = yield* RateLimiterService;

            // Make requests up to the limit
            for (let i = 0; i < 100; i++) {
                yield* rateLimiter.checkRateLimit("127.0.0.1");
            }

            // Next request should be blocked
            const result = yield* rateLimiter.checkRateLimit("127.0.0.1");

            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);
            expect(result.resetTime).toBeDefined();
        }).pipe(Effect.provide(RateLimiterService.Default), Effect.runPromise));

    it("should handle different IPs independently", () =>
        Effect.gen(function* () {
            const rateLimiter = yield* RateLimiterService;

            // Make requests from different IPs
            const result1 = yield* rateLimiter.checkRateLimit("127.0.0.1");
            const result2 = yield* rateLimiter.checkRateLimit("192.168.1.1");

            expect(result1.allowed).toBe(true);
            expect(result2.allowed).toBe(true);
            expect(result1.remaining).toBe(99);
            expect(result2.remaining).toBe(99);
        }).pipe(Effect.provide(RateLimiterService.Default), Effect.runPromise));
});
