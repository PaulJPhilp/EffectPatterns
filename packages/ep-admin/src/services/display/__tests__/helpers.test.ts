/**
 * Display service helper tests
 */

import { Effect, Layer } from "effect";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { colorizeWithConfig, getLoggerConfig } from "../helpers.js";
import { Logger, LoggerDefault } from "../../logger/index.js";
import { ANSI_COLORS } from "../../../constants.js";

describe("Display Helpers", () => {
	describe("colorizeWithConfig", () => {
		it("should apply color when colors enabled", () => {
			const config = {
				logLevel: "info" as const,
				useColors: true,
				outputFormat: "text" as const,
				verbose: false,
			};

			const result = colorizeWithConfig("text", "GREEN", config);
			expect(result).toContain(ANSI_COLORS.GREEN);
			expect(result).toContain(ANSI_COLORS.RESET);
		});

		it("should not apply color when colors disabled", () => {
			const config = {
				logLevel: "info" as const,
				useColors: false,
				outputFormat: "text" as const,
				verbose: false,
			};

			const result = colorizeWithConfig("text", "GREEN", config);
			expect(result).toBe("text");
			expect(result).not.toContain(ANSI_COLORS.GREEN);
		});

		it("should handle different color keys", () => {
			const config = {
				logLevel: "info" as const,
				useColors: true,
				outputFormat: "text" as const,
				verbose: false,
			};

			const redResult = colorizeWithConfig("text", "RED", config);
			const blueResult = colorizeWithConfig("text", "BLUE", config);
			const yellowResult = colorizeWithConfig("text", "YELLOW", config);

			expect(redResult).toContain(ANSI_COLORS.RED);
			expect(blueResult).toContain(ANSI_COLORS.BLUE);
			expect(yellowResult).toContain(ANSI_COLORS.YELLOW);
		});
	});

	describe("getLoggerConfig", () => {
		it("should get logger config from Logger service", async () => {
			const program = getLoggerConfig();

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(LoggerDefault))
			);

			expect(result.logLevel).toBeDefined();
			expect(result.useColors).toBeDefined();
			expect(result.outputFormat).toBeDefined();
			expect(result.verbose).toBeDefined();
		});

		it("should return updated config after logger update", async () => {
			const program = Effect.gen(function* () {
				const logger = yield* Logger;
				yield* logger.updateConfig({ useColors: false });
				return yield* getLoggerConfig();
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(LoggerDefault))
			);

			expect(result.useColors).toBe(false);
		});
	});
});
