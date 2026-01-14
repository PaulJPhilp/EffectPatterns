import { Effect, Either, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { RateLimitError } from "../errors.js";
import { MCPConfigService } from "./config.js";
import { MCPLoggerService } from "./logger.js";
import {
	MCRateLimitService,
	MCRateLimitServiceLive,
	createRateLimitKey,
	getRemainingRequests,
	getResetTime,
} from "./rate-limit.js";

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
});
