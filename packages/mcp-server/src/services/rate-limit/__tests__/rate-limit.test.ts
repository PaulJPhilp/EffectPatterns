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
});
