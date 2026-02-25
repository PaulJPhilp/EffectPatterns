import { Effect, Either, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { MCPConfigService } from "../../config";
import { MCPLoggerService } from "../../logger";
import {
	MCRateLimitService,
	MCRateLimitServiceLive,
	RateLimitError,
	createRateLimitKey,
	getRemainingRequests,
	getResetTime,
} from "../index";

process.env.PATTERN_API_KEY = "test-api-key";
process.env.RATE_LIMIT_ENABLED = "true";
process.env.RATE_LIMIT_REQUESTS = "2";
process.env.RATE_LIMIT_WINDOW_MS = "60000";

const TestLayer = Layer.provide(
	MCRateLimitServiceLive,
	Layer.provide(MCPLoggerService.Default, Layer.provide(MCPConfigService.Default, Layer.empty))
);

describe("MCRateLimitService", () => {
	it("should allow requests up to the limit and then fail", async () => {
		const either = await Effect.runPromise(
			Effect.gen(function* () {
				const rl = yield* MCRateLimitService;
				yield* rl.checkRateLimit("ip:1");
				yield* rl.checkRateLimit("ip:1");
				return yield* rl.checkRateLimit("ip:1");
			}).pipe(Effect.either, Effect.provide(TestLayer))
		);

		expect(Either.isLeft(either)).toBe(true);
		if (Either.isLeft(either)) {
			expect(either.left).toBeInstanceOf(RateLimitError);
			expect(either.left.identifier).toBe("ip:1");
			expect(either.left.limit).toBe(2);
		}
	});

	it("should report status and allow reset", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const rl = yield* MCRateLimitService;
				yield* rl.checkRateLimit("ip:2");
				const status1 = yield* rl.getRateLimitStatus("ip:2");
				yield* rl.resetRateLimit("ip:2");
				const status2 = yield* rl.getRateLimitStatus("ip:2");
				return { status1, status2 };
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.status1.remaining).toBe(1);
		expect(result.status2.remaining).toBe(2);
	});

	it("should provide legacy helpers", () => {
		expect(createRateLimitKey("id", "op")).toBe("op:id");

		const example = {
			allowed: true,
			remaining: 1,
			resetTime: new Date(0),
			limit: 2,
			windowMs: 60000,
		};

		expect(getRemainingRequests(example)).toBe(1);
		expect(getResetTime(example).getTime()).toBe(0);
	});

	it("should handle multiple identifiers independently", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const rl = yield* MCRateLimitService;
				
				// Check rate limit for different identifiers
				yield* rl.checkRateLimit("ip:1");
				yield* rl.checkRateLimit("ip:2");
				yield* rl.checkRateLimit("ip:1");
				
				const status1 = yield* rl.getRateLimitStatus("ip:1");
				const status2 = yield* rl.getRateLimitStatus("ip:2");
				
				return { status1, status2 };
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.status1.remaining).toBe(0);
		expect(result.status2.remaining).toBe(1);
	});

	it("should track requests correctly", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const rl = yield* MCRateLimitService;
				
				const status0 = yield* rl.getRateLimitStatus("ip:3");
				yield* rl.checkRateLimit("ip:3");
				const status1 = yield* rl.getRateLimitStatus("ip:3");
				
				return { status0, status1 };
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.status0.remaining).toBe(2);
		expect(result.status1.remaining).toBe(1);
	});

	it("should support rate limit status queries", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const rl = yield* MCRateLimitService;
				
				const status = yield* rl.getRateLimitStatus("ip:4");
				
				return status;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.allowed).toBe(true);
		expect(result.limit).toBe(2);
		expect(result.remaining).toBe(2);
		expect(result.resetTime).toBeDefined();
		expect(result.windowMs).toBe(60000);
	});

	it("should allow all requests when rate limiting is disabled", async () => {
		// Temporarily disable rate limiting
		const originalEnabled = process.env.RATE_LIMIT_ENABLED;
		process.env.RATE_LIMIT_ENABLED = "false";

		try {
			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const rl = yield* MCRateLimitService;
					
					// Make many requests - all should be allowed
					for (let i = 0; i < 10; i++) {
						yield* rl.checkRateLimit("ip:disabled");
					}
					
					const status = yield* rl.getRateLimitStatus("ip:disabled");
					return status;
				}).pipe(Effect.provide(TestLayer))
			);

			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(2); // Should return the configured limit
		} finally {
			process.env.RATE_LIMIT_ENABLED = originalEnabled;
		}
	});

	it("should handle window reset correctly", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const rl = yield* MCRateLimitService;
				
				// Use up the limit
				yield* rl.checkRateLimit("ip:window");
				yield* rl.checkRateLimit("ip:window");
				
				// Reset the window
				yield* rl.resetRateLimit("ip:window");
				
				// Should be able to make requests again
				const status = yield* rl.checkRateLimit("ip:window");
				return status;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(1); // One request used after reset
	});

	it("should handle status query for expired window", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const rl = yield* MCRateLimitService;
				
				// Use up the limit
				yield* rl.checkRateLimit("ip:expired");
				yield* rl.checkRateLimit("ip:expired");
				
				// Get status - should show limit exceeded
				const statusBefore = yield* rl.getRateLimitStatus("ip:expired");
				
				// Reset to simulate window expiration
				yield* rl.resetRateLimit("ip:expired");
				
				// Status after reset should show full limit available
				const statusAfter = yield* rl.getRateLimitStatus("ip:expired");
				
				return { statusBefore, statusAfter };
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.statusBefore.remaining).toBe(0);
		expect(result.statusAfter.remaining).toBe(2);
	});

	it("should handle getRateLimitStatus for new identifier", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const rl = yield* MCRateLimitService;
				
				// Query status for identifier that hasn't made requests
				const status = yield* rl.getRateLimitStatus("ip:new");
				
				return status;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(2);
		expect(result.limit).toBe(2);
	});

	it("should expose configuration access methods", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const rl = yield* MCRateLimitService;
				
				const enabled = yield* rl.isEnabled();
				const requests = yield* rl.getRequests();
				const windowMs = yield* rl.getWindowMs();
				
				return { enabled, requests, windowMs };
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result.enabled).toBe(true);
		expect(result.requests).toBe(2);
		expect(result.windowMs).toBe(60000);
	});
});
