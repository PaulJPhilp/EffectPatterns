/**
 * Unit tests for Logger service — no behavioral mocks.
 * Uses captureConsole() to intercept console output.
 */

import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { captureConsole } from "../test/helpers.js";
import {
	LOG_LEVEL_VALUES,
	LogLevelPriority,
	Logger,
	LoggerDefault,
	LoggerLive,
	defaultLoggerConfig,
	logDebug,
	logError,
	logInfo,
	logSuccess,
	logWarn,
	makeLogger,
	parseLogLevel,
	type LoggerConfig,
} from "../services/logger/index.js";

describe("Logger Service", () => {
	let capture: ReturnType<typeof captureConsole>;

	beforeEach(() => {
		capture = captureConsole();
	});

	afterEach(() => {
		capture.restore();
	});

	describe("LogLevelPriority", () => {
		it("should have correct priority order", () => {
			expect(LogLevelPriority.debug).toBeLessThan(LogLevelPriority.info);
			expect(LogLevelPriority.info).toBeLessThan(LogLevelPriority.warn);
			expect(LogLevelPriority.warn).toBeLessThan(LogLevelPriority.error);
			expect(LogLevelPriority.error).toBeLessThan(LogLevelPriority.silent);
		});
	});

	describe("defaultLoggerConfig", () => {
		it("should have sensible defaults", () => {
			expect(defaultLoggerConfig.logLevel).toBe("info");
			expect(defaultLoggerConfig.useColors).toBe(true);
			expect(defaultLoggerConfig.outputFormat).toBe("text");
			expect(defaultLoggerConfig.verbose).toBe(false);
		});
	});

	describe("makeLogger", () => {
		it("should create a logger with default config", async () => {
			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const logger = yield* makeLogger();
					const config = yield* logger.getConfig();
					return config;
				})
			);

			expect(result.logLevel).toBe("info");
			expect(result.useColors).toBe(true);
		});

		it("should create a logger with custom config", async () => {
			const customConfig: LoggerConfig = {
				logLevel: "debug",
				useColors: false,
				outputFormat: "json",
				verbose: true,
			};

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const logger = yield* makeLogger(customConfig);
					const config = yield* logger.getConfig();
					return config;
				})
			);

			expect(result.logLevel).toBe("debug");
			expect(result.useColors).toBe(false);
			expect(result.outputFormat).toBe("json");
			expect(result.verbose).toBe(true);
		});

		it("should filter messages below configured level", async () => {
			await Effect.runPromise(
				Effect.gen(function* () {
					const logger = yield* makeLogger({ ...defaultLoggerConfig, logLevel: "warn" });

					yield* logger.debug("debug message");
					yield* logger.info("info message");
					yield* logger.warn("warn message");
					yield* logger.error("error message");
				})
			);

			expect(capture.logs).toHaveLength(0);
			expect(capture.warns).toHaveLength(1);
			expect(capture.errors).toHaveLength(1);
		});

		it("should use correct console methods for each level", async () => {
			await Effect.runPromise(
				Effect.gen(function* () {
					const logger = yield* makeLogger({ ...defaultLoggerConfig, logLevel: "debug" });

					yield* logger.debug("debug");
					yield* logger.info("info");
					yield* logger.warn("warn");
					yield* logger.error("error");
					yield* logger.success("success");
				})
			);

			// debug, info, success -> console.log (3 calls)
			expect(capture.logs).toHaveLength(3);
			// warn -> console.warn (1 call)
			expect(capture.warns).toHaveLength(1);
			// error -> console.error (1 call)
			expect(capture.errors).toHaveLength(1);
		});
	});

	describe("JSON output format", () => {
		it("should output valid JSON", async () => {
			await Effect.runPromise(
				Effect.gen(function* () {
					const logger = yield* makeLogger({
						...defaultLoggerConfig,
						outputFormat: "json",
						logLevel: "info",
					});

					yield* logger.info("test message", { key: "value" });
				})
			);

			expect(capture.logs).toHaveLength(1);
			const output = capture.logs[0]!;

			const parsed = JSON.parse(output);
			expect(parsed.level).toBe("info");
			expect(parsed.message).toBe("test message");
			expect(parsed.data).toEqual({ key: "value" });
			expect(parsed.timestamp).toBeDefined();
		});
	});

	describe("shouldLog", () => {
		it("should correctly determine if level should be logged", async () => {
			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const logger = yield* makeLogger({ ...defaultLoggerConfig, logLevel: "warn" });

					return {
						debug: yield* logger.shouldLog("debug"),
						info: yield* logger.shouldLog("info"),
						warn: yield* logger.shouldLog("warn"),
						error: yield* logger.shouldLog("error"),
					};
				})
			);

			expect(result.debug).toBe(false);
			expect(result.info).toBe(false);
			expect(result.warn).toBe(true);
			expect(result.error).toBe(true);
		});
	});

	describe("updateConfig", () => {
		it("should update configuration dynamically", async () => {
			await Effect.runPromise(
				Effect.gen(function* () {
					const logger = yield* makeLogger({ ...defaultLoggerConfig, logLevel: "error" });

					yield* logger.info("should not appear");
					expect(capture.logs).toHaveLength(0);

					yield* logger.updateConfig({ logLevel: "info" });

					yield* logger.info("should appear now");
					expect(capture.logs).toHaveLength(1);
				})
			);
		});
	});

	describe("LoggerLive layer", () => {
		it("should provide logger with custom config", async () => {
			const program = Effect.gen(function* () {
				const logger = yield* Logger;
				const config = yield* logger.getConfig();
				return config;
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(LoggerLive({ logLevel: "debug" })))
			);

			expect(result.logLevel).toBe("debug");
		});
	});

	describe("LoggerDefault layer", () => {
		it("should provide logger with default config", async () => {
			const program = Effect.gen(function* () {
				const logger = yield* Logger;
				const config = yield* logger.getConfig();
				return config;
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(LoggerDefault))
			);

			expect(result.logLevel).toBe("info");
		});
	});

	describe("Convenience functions", () => {
		const testLayer = LoggerLive({ logLevel: "debug" });

		it("logDebug should log at debug level", async () => {
			await Effect.runPromise(logDebug("debug test").pipe(Effect.provide(testLayer)));

			expect(capture.logs).toHaveLength(1);
			expect(capture.logs[0]).toContain("debug test");
		});

		it("logInfo should log at info level", async () => {
			await Effect.runPromise(logInfo("info test").pipe(Effect.provide(testLayer)));

			expect(capture.logs).toHaveLength(1);
			expect(capture.logs[0]).toContain("info test");
		});

		it("logWarn should log at warn level", async () => {
			await Effect.runPromise(logWarn("warn test").pipe(Effect.provide(testLayer)));

			expect(capture.warns).toHaveLength(1);
			expect(capture.warns[0]).toContain("warn test");
		});

		it("logError should log at error level", async () => {
			await Effect.runPromise(logError("error test").pipe(Effect.provide(testLayer)));

			expect(capture.errors).toHaveLength(1);
			expect(capture.errors[0]).toContain("error test");
		});

		it("logSuccess should log at info level", async () => {
			await Effect.runPromise(logSuccess("success test").pipe(Effect.provide(testLayer)));

			expect(capture.logs).toHaveLength(1);
			expect(capture.logs[0]).toContain("success test");
		});
	});

	describe("parseLogLevel", () => {
		it("should parse valid log levels", () => {
			expect(parseLogLevel("debug")).toBe("debug");
			expect(parseLogLevel("info")).toBe("info");
			expect(parseLogLevel("warn")).toBe("warn");
			expect(parseLogLevel("error")).toBe("error");
			expect(parseLogLevel("silent")).toBe("silent");
		});

		it("should handle case insensitivity", () => {
			expect(parseLogLevel("DEBUG")).toBe("debug");
			expect(parseLogLevel("Info")).toBe("info");
			expect(parseLogLevel("WARN")).toBe("warn");
		});

		it("should handle whitespace", () => {
			expect(parseLogLevel("  debug  ")).toBe("debug");
		});

		it("should return undefined for invalid levels", () => {
			expect(parseLogLevel("verbose")).toBeUndefined();
			expect(parseLogLevel("trace")).toBeUndefined();
			expect(parseLogLevel("")).toBeUndefined();
			expect(parseLogLevel("invalid")).toBeUndefined();
		});
	});

	describe("LOG_LEVEL_VALUES", () => {
		it("should contain all valid log levels", () => {
			expect(LOG_LEVEL_VALUES).toContain("debug");
			expect(LOG_LEVEL_VALUES).toContain("info");
			expect(LOG_LEVEL_VALUES).toContain("warn");
			expect(LOG_LEVEL_VALUES).toContain("error");
			expect(LOG_LEVEL_VALUES).toContain("silent");
			expect(LOG_LEVEL_VALUES).toHaveLength(5);
		});
	});

	describe("Color output", () => {
		it("should include ANSI codes when colors enabled", async () => {
			await Effect.runPromise(
				Effect.gen(function* () {
					const logger = yield* makeLogger({
						...defaultLoggerConfig,
						useColors: true,
						logLevel: "info",
					});

					yield* logger.info("colored message");
				})
			);

			const output = capture.logs[0]!;
			expect(output).toContain("\x1b[");
		});

		it("should omit ANSI codes when colors disabled", async () => {
			await Effect.runPromise(
				Effect.gen(function* () {
					const logger = yield* makeLogger({
						...defaultLoggerConfig,
						useColors: false,
						logLevel: "info",
					});

					yield* logger.info("plain message");
				})
			);

			const output = capture.logs[0]!;
			expect(output).not.toContain("\x1b[");
		});
	});

	describe("Verbose mode", () => {
		it("should include data in verbose mode", async () => {
			await Effect.runPromise(
				Effect.gen(function* () {
					const logger = yield* makeLogger({
						...defaultLoggerConfig,
						verbose: true,
						logLevel: "info",
					});

					yield* logger.info("message", { extra: "data" });
				})
			);

			const output = capture.logs[0]!;
			expect(output).toContain("extra");
			expect(output).toContain("data");
		});

		it("should not include data in non-verbose mode", async () => {
			await Effect.runPromise(
				Effect.gen(function* () {
					const logger = yield* makeLogger({
						...defaultLoggerConfig,
						verbose: false,
						logLevel: "info",
					});

					yield* logger.info("message", { extra: "data" });
				})
			);

			const output = capture.logs[0]!;
			expect(output).not.toContain("extra");
			expect(output).not.toContain("data");
		});
	});
});
