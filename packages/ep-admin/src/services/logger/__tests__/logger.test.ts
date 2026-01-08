/**
 * Logger service tests
 */

import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Logger } from "../index.js";

describe("Logger Service", () => {
	it("should create logger with default config", async () => {
		const program = Effect.gen(function* () {
			const logger = yield* Logger;
			const config = yield* logger.getConfig();

			return {
				logLevel: config.logLevel,
				useColors: config.useColors,
				outputFormat: config.outputFormat,
				verbose: config.verbose,
			};
		});

		const result = await Effect.runPromise(
			program.pipe(Effect.provide(Logger.Default))
		);

		expect(result.logLevel).toBe("info");
		expect(result.useColors).toBe(true);
		expect(result.outputFormat).toBe("text");
		expect(result.verbose).toBe(false);
	});

	it("should update configuration", async () => {
		const program = Effect.gen(function* () {
			const logger = yield* Logger;

			yield* logger.updateConfig({ logLevel: "debug", verbose: true });

			const config = yield* logger.getConfig();
			return config;
		});

		const result = await Effect.runPromise(
			program.pipe(Effect.provide(Logger.Default))
		);

		expect(result.logLevel).toBe("debug");
		expect(result.verbose).toBe(true);
	});

	it("should filter log messages by level", async () => {
		const program = Effect.gen(function* () {
			const logger = yield* Logger;

			// Update to error level to test filtering
			yield* logger.updateConfig({ logLevel: "error" });

			const shouldLogDebug = logger.shouldLog("debug");
			const shouldLogError = logger.shouldLog("error");

			return { shouldLogDebug, shouldLogError };
		});

		const result = await Effect.runPromise(
			program.pipe(Effect.provide(Logger.Default))
		);

		expect(result.shouldLogDebug).toBe(false);
		expect(result.shouldLogError).toBe(true);
	});
});
