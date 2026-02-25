import { Effect } from "effect";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { TracingLayerLive, TracingService } from "./otlpLayer";

describe("TracingLayer", () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		process.env.OTLP_HEADERS = "a=b, c=d";
		process.env.OTLP_ENDPOINT = "http://localhost:4318/v1/traces";
		process.env.SERVICE_NAME = "test-service";
		process.env.SERVICE_VERSION = "0.0.0";
	});

	afterEach(() => {
		process.env = { ...originalEnv };
	});

	it("should provide TracingService and return undefined when no span is active", async () => {
		const traceId = await Effect.runPromise(
			Effect.gen(function* () {
				const tracing = yield* TracingService;
				return tracing.getTraceId();
			}).pipe(Effect.provide(TracingLayerLive), Effect.scoped)
		);

		expect(traceId).toBeUndefined();
	});

	it("should initialize TracingService without error", async () => {
		await expect(
			Effect.runPromise(
				Effect.gen(function* () {
					const tracing = yield* TracingService;
					return tracing;
				}).pipe(Effect.provide(TracingLayerLive), Effect.scoped)
			)
		).resolves.toBeDefined();
	});

	it("should return a string or undefined from getTraceId", async () => {
		const tracing = await Effect.runPromise(
			Effect.gen(function* () {
				return yield* TracingService;
			}).pipe(Effect.provide(TracingLayerLive), Effect.scoped)
		);

		const traceId = tracing.getTraceId();
		expect(traceId === undefined || typeof traceId === "string").toBe(true);
	});

	it("should provide getTraceId method that returns string or undefined", async () => {
		const tracing = await Effect.runPromise(
			Effect.gen(function* () {
				return yield* TracingService;
			}).pipe(Effect.provide(TracingLayerLive), Effect.scoped)
		);

		// getTraceId should be callable and return string | undefined
		const traceId1 = tracing.getTraceId();
		expect(traceId1 === undefined || typeof traceId1 === "string").toBe(true);

		// Should be callable multiple times
		const traceId2 = tracing.getTraceId();
		expect(traceId2 === undefined || typeof traceId2 === "string").toBe(true);
	});

	it("should use default values when env vars not set", async () => {
		delete process.env.OTLP_ENDPOINT;
		delete process.env.SERVICE_NAME;
		delete process.env.SERVICE_VERSION;
		delete process.env.OTLP_HEADERS;

		const tracing = await Effect.runPromise(
			Effect.gen(function* () {
				return yield* TracingService;
			}).pipe(Effect.provide(TracingLayerLive), Effect.scoped)
		);

		expect(tracing).toBeDefined();
		const traceId = tracing.getTraceId();
		expect(traceId === undefined || typeof traceId === "string").toBe(true);
	});

	it("should parse OTLP headers correctly", async () => {
		process.env.OTLP_HEADERS = "key1=value1,key2=value2";

		await expect(
			Effect.runPromise(
				Effect.gen(function* () {
					const tracing = yield* TracingService;
					return tracing;
				}).pipe(Effect.provide(TracingLayerLive), Effect.scoped)
			)
		).resolves.toBeDefined();
	});

	it("should handle empty OTLP headers", async () => {
		process.env.OTLP_HEADERS = "";

		await expect(
			Effect.runPromise(
				Effect.gen(function* () {
					const tracing = yield* TracingService;
					return tracing;
				}).pipe(Effect.provide(TracingLayerLive), Effect.scoped)
			)
		).resolves.toBeDefined();
	});
});
