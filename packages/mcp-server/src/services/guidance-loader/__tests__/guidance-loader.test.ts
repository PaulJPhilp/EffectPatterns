import { describe, it, expect } from "vitest";
import { GuidanceLoaderService } from "../api";
import { Effect, Layer } from "effect";
import { MCPConfigService } from "../../config";
import { MCPLoggerService } from "../../logger";

const TestLayer = Layer.provideMerge(
	GuidanceLoaderService.Default,
	Layer.provideMerge(
		MCPLoggerService.Default,
		MCPConfigService.Default
	)
);

describe("GuidanceLoaderService", () => {
	it("should return undefined for unknown ruleId", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const service = yield* GuidanceLoaderService;

				const res = yield* service.loadGuidance("unknown-rule");
				return res;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBeUndefined();
	});

	it("should get guidance key from mapping", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const service = yield* GuidanceLoaderService;

				const key = yield* service.getGuidanceKey("async-await");
				return key;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBe("async-await-in-effect");
	});

	it("should return full result with loadGuidanceWithKey", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const service = yield* GuidanceLoaderService;

				const res = yield* service.loadGuidanceWithKey("unknown-rule");
				return res;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toHaveProperty("ruleId");
		expect(result).toHaveProperty("key");
		expect(result).toHaveProperty("content");
		expect(result.key).toBeUndefined();
		expect(result.content).toBeUndefined();
	});

	it("should return guidance mappings", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const service = yield* GuidanceLoaderService;

				const mappings = yield* service.getGuidanceMappings();
				return mappings;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBeDefined();
		expect(result["async-await"]).toBe("async-await-in-effect");
		expect(result["generic-error-type"]).toBe("generic-error-type");
	});
});
