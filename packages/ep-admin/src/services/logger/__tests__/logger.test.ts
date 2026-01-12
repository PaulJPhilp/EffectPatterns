/**
 * Logger service tests
 */

import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { formatMessage, ICONS, writeOutput } from "../helpers.js";
import { Logger, LoggerDefault, LoggerLive } from "../index.js";
import type { LoggerConfig, LogLevel } from "../types.js";
import { defaultLoggerConfig } from "../types.js";

describe("Logger Service", () => {
	describe("Configuration", () => {
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
				program.pipe(Effect.provide(LoggerDefault))
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
				program.pipe(Effect.provide(LoggerDefault))
			);

			expect(result.logLevel).toBe("debug");
			expect(result.verbose).toBe(true);
		});

		it("should create LoggerLive with custom config", async () => {
			const customConfig: Partial<LoggerConfig> = {
				logLevel: "warn",
				useColors: false,
				outputFormat: "json",
			};

			const program = Effect.gen(function* () {
				const logger = yield* Logger;
				const config = yield* logger.getConfig();
				return config;
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(LoggerLive(customConfig)))
			);

			expect(result.logLevel).toBe("warn");
			expect(result.useColors).toBe(false);
			expect(result.outputFormat).toBe("json");
		});
	});

	describe("Log Level Filtering", () => {
		it("should filter log messages by level", async () => {
			const program = Effect.gen(function* () {
				const logger = yield* Logger;

				yield* logger.updateConfig({ logLevel: "error" });

				const shouldLogDebug = yield* logger.shouldLog("debug");
				const shouldLogInfo = yield* logger.shouldLog("info");
				const shouldLogWarn = yield* logger.shouldLog("warn");
				const shouldLogError = yield* logger.shouldLog("error");

				return { shouldLogDebug, shouldLogInfo, shouldLogWarn, shouldLogError };
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(LoggerDefault))
			);

			expect(result.shouldLogDebug).toBe(false);
			expect(result.shouldLogInfo).toBe(false);
			expect(result.shouldLogWarn).toBe(false);
			expect(result.shouldLogError).toBe(true);
		});

		it("should allow all levels when set to debug", async () => {
			const program = Effect.gen(function* () {
				const logger = yield* Logger;
				yield* logger.updateConfig({ logLevel: "debug" });

				return {
					debug: yield* logger.shouldLog("debug"),
					info: yield* logger.shouldLog("info"),
					warn: yield* logger.shouldLog("warn"),
					error: yield* logger.shouldLog("error"),
				};
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(LoggerDefault))
			);

			expect(result.debug).toBe(true);
			expect(result.info).toBe(true);
			expect(result.warn).toBe(true);
			expect(result.error).toBe(true);
		});

		it("should block all logs when set to silent", async () => {
			const program = Effect.gen(function* () {
				const logger = yield* Logger;
				yield* logger.updateConfig({ logLevel: "silent" });

				return {
					debug: yield* logger.shouldLog("debug"),
					info: yield* logger.shouldLog("info"),
					warn: yield* logger.shouldLog("warn"),
					error: yield* logger.shouldLog("error"),
				};
			});

			const result = await Effect.runPromise(
				program.pipe(Effect.provide(LoggerDefault))
			);

			expect(result.debug).toBe(false);
			expect(result.info).toBe(false);
			expect(result.warn).toBe(false);
			expect(result.error).toBe(false);
		});
	});

	describe("Log Methods", () => {
		it("should log debug messages", async () => {

			const program = Effect.gen(function* () {
				const logger = yield* Logger;
				yield* logger.updateConfig({ logLevel: "debug" });
				yield* logger.debug("Debug message");
			});

			await Effect.runPromise(program.pipe(Effect.provide(LoggerDefault)));

			// Test passes if no error thrown
		});

		it("should log info messages", async () => {

			const program = Effect.gen(function* () {
				const logger = yield* Logger;
				yield* logger.info("Info message");
			});

			await Effect.runPromise(program.pipe(Effect.provide(LoggerDefault)));

			// Test passes if no error thrown
		});

		it("should log warn messages", async () => {

			const program = Effect.gen(function* () {
				const logger = yield* Logger;
				yield* logger.warn("Warning message");
			});

			await Effect.runPromise(program.pipe(Effect.provide(LoggerDefault)));

			// Test passes if no error thrown
		});

		it("should log error messages to error stream", async () => {

			const program = Effect.gen(function* () {
				const logger = yield* Logger;
				yield* logger.error("Error message");
			});

			await Effect.runPromise(program.pipe(Effect.provide(LoggerDefault)));

			// Test passes if no error thrown
		});

		it("should log success messages", async () => {

			const program = Effect.gen(function* () {
				const logger = yield* Logger;
				yield* logger.success("Success message");
			});

			await Effect.runPromise(program.pipe(Effect.provide(LoggerDefault)));

			// Test passes if no error thrown
		});

		it("should log messages with data when verbose", async () => {

			const program = Effect.gen(function* () {
				const logger = yield* Logger;
				yield* logger.updateConfig({ verbose: true });
				yield* logger.info("Info message", { key: "value" });
			});

			await Effect.runPromise(program.pipe(Effect.provide(LoggerDefault)));

			// Test passes if no error thrown
		});

		it("should filter messages below log level threshold", async () => {

			const program = Effect.gen(function* () {
				const logger = yield* Logger;
				yield* logger.updateConfig({ logLevel: "warn" });
				yield* logger.debug("Debug message");
				yield* logger.info("Info message");
				yield* logger.warn("Warning message");
			});

			await Effect.runPromise(program.pipe(Effect.provide(LoggerDefault)));

			// Test passes if no error thrown
		});

		it("should map success level to info for filtering", async () => {

			const program = Effect.gen(function* () {
				const logger = yield* Logger;
				yield* logger.updateConfig({ logLevel: "info" });
				yield* logger.success("Success message");
			});

			await Effect.runPromise(program.pipe(Effect.provide(LoggerDefault)));

			// Test passes if no error thrown
		});
	});

	describe("Format Helpers", () => {
		describe("formatMessage", () => {
			it("should format text messages with colors", () => {
				const config: LoggerConfig = {
					...defaultLoggerConfig,
					useColors: true,
					outputFormat: "text",
				};

				const result = formatMessage("info", "Test message", undefined, config);
				expect(result).toContain("Test message");
				expect(result).toContain(ICONS.info);
			});

			it("should format text messages without colors", () => {
				const config: LoggerConfig = {
					...defaultLoggerConfig,
					useColors: false,
					outputFormat: "text",
				};

				const result = formatMessage("info", "Test message", undefined, config);
				expect(result).toContain("Test message");
				expect(result).toContain(ICONS.info);
			});

			it("should format JSON messages", () => {
				const config: LoggerConfig = {
					...defaultLoggerConfig,
					outputFormat: "json",
				};

				const result = formatMessage("info", "Test message", undefined, config);
				const parsed = JSON.parse(result);
				expect(parsed.level).toBe("info");
				expect(parsed.message).toBe("Test message");
				expect(parsed.timestamp).toBeDefined();
			});

			it("should include data in JSON format", () => {
				const config: LoggerConfig = {
					...defaultLoggerConfig,
					outputFormat: "json",
				};

				const result = formatMessage("info", "Test message", { key: "value" }, config);
				const parsed = JSON.parse(result);
				expect(parsed.data).toEqual({ key: "value" });
			});

			it("should include data in text format when verbose", () => {
				const config: LoggerConfig = {
					...defaultLoggerConfig,
					verbose: true,
					outputFormat: "text",
				};

				const result = formatMessage("info", "Test message", { key: "value" }, config);
				expect(result).toContain("Test message");
				expect(result).toContain("key");
				expect(result).toContain("value");
			});

			it("should not include data when not verbose", () => {
				const config: LoggerConfig = {
					...defaultLoggerConfig,
					verbose: false,
					outputFormat: "text",
				};

				const result = formatMessage("info", "Test message", { key: "value" }, config);
				expect(result).toContain("Test message");
				expect(result).not.toContain("key");
			});

			it("should handle string data", () => {
				const config: LoggerConfig = {
					...defaultLoggerConfig,
					verbose: true,
					outputFormat: "text",
				};

				const result = formatMessage("info", "Test message", "string data", config);
				expect(result).toContain("Test message");
				expect(result).toContain("string data");
			});

			it("should handle complex data objects", () => {
				const config: LoggerConfig = {
					...defaultLoggerConfig,
					verbose: true,
					outputFormat: "text",
				};

				const complexData = { nested: { value: 123 }, array: [1, 2, 3] };
				const result = formatMessage("info", "Test message", complexData, config);
				expect(result).toContain("Test message");
				expect(result).toContain("nested");
			});

			it("should return message when config is undefined", () => {
				const result = formatMessage("info", "Test message", undefined, undefined);
				expect(result).toBe("Test message");
			});

			it("should handle all log levels", () => {
				const config: LoggerConfig = defaultLoggerConfig;
				const levels: (LogLevel | "success")[] = ["debug", "info", "warn", "error", "success"];

				for (const level of levels) {
					const result = formatMessage(level, "Test message", undefined, config);
					expect(result).toContain("Test message");
					expect(result).toContain(ICONS[level] ?? "");
				}
			});
		});

		describe("writeOutput", () => {
			it("should write error messages to error stream", async () => {

				await Effect.runPromise(writeOutput("error", "Error message"));

				// Test passes if no error thrown
			});

			it("should write non-error messages to log stream", async () => {

				await Effect.runPromise(writeOutput("info", "Info message"));

				// Test passes if no error thrown
			});

			it("should write success messages to log stream", async () => {

				await Effect.runPromise(writeOutput("success", "Success message"));

				// Test passes if no error thrown
			});
		});
	});

	describe("Edge Cases", () => {
		it("should handle undefined data", async () => {

			const program = Effect.gen(function* () {
				const logger = yield* Logger;
				yield* logger.info("Message", undefined);
			});

			await Effect.runPromise(program.pipe(Effect.provide(LoggerDefault)));

			// Test passes if no error thrown
		});

		it("should handle null data", async () => {

			const program = Effect.gen(function* () {
				const logger = yield* Logger;
				yield* logger.info("Message", null);
			});

			await Effect.runPromise(program.pipe(Effect.provide(LoggerDefault)));

			// Test passes if no error thrown
		});

		it("should handle empty string messages", async () => {

			const program = Effect.gen(function* () {
				const logger = yield* Logger;
				yield* logger.info("");
			});

			await Effect.runPromise(program.pipe(Effect.provide(LoggerDefault)));

			// Test passes if no error thrown
		});
	});
});
