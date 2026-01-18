import { Effect, Either } from "effect";
import { describe, expect, it } from "vitest";
import { ConfigurationError } from "../errors";
import { MCPConfigService } from "./config";

describe("MCPConfigService", () => {
	const originalEnv = { ...process.env };

	const restoreEnv = () => {
		process.env = { ...originalEnv };
	};

	const setEnv = (overrides: Record<string, string>) => {
		restoreEnv();
		for (const [k, v] of Object.entries(overrides)) {
			process.env[k] = v;
		}
	};

	it("should load config with defaults in development", async () => {
		setEnv({
			NODE_ENV: "development",
			PATTERN_API_KEY: "test-api-key",
		});

		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const config = yield* MCPConfigService;
				return {
					apiKey: yield* config.getApiKey(),
					port: yield* config.getPort(),
					maxSearchResults: yield* config.getMaxSearchResults(),
				};
			}).pipe(Effect.provide(MCPConfigService.Default))
		);

		expect(result.apiKey).toBe("test-api-key");
		expect(result.port).toBeGreaterThan(0);
		expect(result.maxSearchResults).toBeGreaterThan(0);
	});

	it("should reject invalid port", async () => {
		setEnv({
			NODE_ENV: "development",
			PATTERN_API_KEY: "test-api-key",
			PORT: "70000",
		});

		const either = await Effect.runPromise(
			Effect.gen(function* () {
				const config = yield* MCPConfigService;
				return yield* config.getPort();
			}).pipe(Effect.provide(MCPConfigService.Default), Effect.either)
		);

		expect(Either.isLeft(either)).toBe(true);
		if (Either.isLeft(either)) {
			expect(either.left).toBeInstanceOf(ConfigurationError);
			expect(either.left.key).toBe("port");
			expect(either.left.expected).toContain("1-65535");
			expect(either.left.received).toBe(70000);
		}
	});

	it("should reject invalid log level", async () => {
		setEnv({
			NODE_ENV: "development",
			PATTERN_API_KEY: "test-api-key",
			LOG_LEVEL: "nope",
		});

		const either = await Effect.runPromise(
			Effect.gen(function* () {
				const config = yield* MCPConfigService;
				return yield* config.getLogLevel();
			}).pipe(Effect.provide(MCPConfigService.Default), Effect.either)
		);

		expect(Either.isLeft(either)).toBe(true);
		if (Either.isLeft(either)) {
			expect(either.left).toBeInstanceOf(ConfigurationError);
			expect(either.left.key).toBe("logLevel");
			expect(either.left.expected).toContain("one of");
			expect(either.left.received).toBe("nope");
		}
	});

	it("should reject too-small request timeout", async () => {
		setEnv({
			NODE_ENV: "development",
			PATTERN_API_KEY: "test-api-key",
			REQUEST_TIMEOUT_MS: "500",
		});

		const either = await Effect.runPromise(
			Effect.gen(function* () {
				const config = yield* MCPConfigService;
				return yield* config.getRequestTimeoutMs();
			}).pipe(Effect.provide(MCPConfigService.Default), Effect.either)
		);

		expect(Either.isLeft(either)).toBe(true);
		if (Either.isLeft(either)) {
			expect(either.left).toBeInstanceOf(ConfigurationError);
			expect(either.left.key).toBe("requestTimeoutMs");
			expect(either.left.expected).toContain("at least");
			expect(either.left.received).toBe(500);
		}
	});

	it("should parse OTLP headers", async () => {
		setEnv({
			NODE_ENV: "development",
			PATTERN_API_KEY: "test-api-key",
			OTLP_HEADERS: "a=b,c=d",
		});

		const headers = await Effect.runPromise(
			Effect.gen(function* () {
				const config = yield* MCPConfigService;
				return yield* config.getOtlpHeaders();
			}).pipe(Effect.provide(MCPConfigService.Default))
		);

		expect(headers).toEqual({ a: "b", c: "d" });
	});

	it("should restore process.env", () => {
		restoreEnv();
		expect(process.env).toEqual(originalEnv);
	});
});
