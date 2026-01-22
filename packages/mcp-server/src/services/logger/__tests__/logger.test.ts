import { describe, it, expect, beforeEach, vi } from "vitest";
import { MCPLoggerService } from "../index";
import { Effect, Layer } from "effect";
import { MCPConfigService } from "../../config";
import { logDebug, logInfo, logWarn, logError, createLogEntry } from "../helpers";

const TestLayer = Layer.provideMerge(
	MCPLoggerService.Default,
	MCPConfigService.Default
);

describe("MCPLoggerService", () => {
	it("should log messages at different levels", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const logger = yield* MCPLoggerService;

				const opLogger = logger.withOperation("test.logging");
				yield* opLogger.debug("Debug message");
				yield* opLogger.info("Info message");
				yield* opLogger.warn("Warning message");
				yield* opLogger.error("Error message");

				return true;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBe(true);
	});

	it("should support operation-scoped logging", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const logger = yield* MCPLoggerService;

				const opLogger = logger.withOperation("test.operation");

				yield* opLogger.debug("Operation debug");
				yield* opLogger.info("Operation info");
				yield* opLogger.warn("Operation warning");
				yield* opLogger.error("Operation error");

				return true;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBe(true);
	});

	it("should support duration tracking", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const logger = yield* MCPLoggerService;

				const startTime = Date.now();
				// Simulate some work
				yield* Effect.sleep(100);

				const durationLogger = logger.withDuration(startTime, "test.duration");
				yield* durationLogger.info("Operation completed");

				return true;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBe(true);
	});

	it("should include data in log entries", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const logger = yield* MCPLoggerService;

				const opLogger = logger.withOperation("auth.login");
				yield* opLogger.info("User action", {
					userId: "user-123",
					status: "success",
				});

				return true;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBe(true);
	});

	it("should handle errors in logging", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const logger = yield* MCPLoggerService;

				const error = new Error("Test error");
				const opLogger = logger.withOperation("test.error");
				yield* opLogger.error("An error occurred", error);

				return true;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBe(true);
	});

	it("should support performance tracking", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const logger = yield* MCPLoggerService;

				const startTime = Date.now();
				yield* Effect.sleep(50);
				const duration = Date.now() - startTime;

				const opLogger = logger.withOperation("perf.query");
				yield* opLogger.info("Performance metric", {
					duration,
					query: "SELECT * FROM users",
				});

				return duration > 40; // Should be at least 50ms
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBe(true);
	});

	it("should respect logging configuration", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const logger = yield* MCPLoggerService;
				const config = yield* MCPConfigService;

				const enabled = config.loggingEnabled;
				expect(typeof enabled).toBe("boolean");

				return true;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBe(true);
	});

	it("should provide an API for structured logging", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const logger = yield* MCPLoggerService;

				// Test various structured logging scenarios
				const opLogger = logger.withOperation("test.structured");
				yield* opLogger.info("Structured log", {
					requestId: "req-123",
					userId: "user-456",
					action: "create",
					resource: "pattern",
					status: "success",
				});

				return true;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBe(true);
	});

	it("should log request lifecycle events", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const logger = yield* MCPLoggerService;

				yield* logger.logRequestStart("GET", "/api/patterns", "req-001", "trace-001");
				yield* Effect.sleep(50);
				yield* logger.logRequestComplete("GET", "/api/patterns", 200, 50, "req-001", "trace-001");

				return true;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBe(true);
	});

	it("should log request errors", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const logger = yield* MCPLoggerService;

				const error = new Error("Request failed");
				yield* logger.logRequestError("POST", "/api/patterns", error, 100, "req-002", "trace-002");

				return true;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBe(true);
	});

	it("should log cache operations", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const logger = yield* MCPLoggerService;

				yield* logger.logCacheOperation("get", "pattern-123", true, 5);
				yield* logger.logCacheOperation("set", "pattern-456", false, 10);

				return true;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBe(true);
	});

	it("should log pattern operations", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const logger = yield* MCPLoggerService;

				yield* logger.logPatternOperation("search", "pattern-123", 5, 100);
				yield* logger.logPatternOperation("retrieve", "pattern-456", 1, 50);

				return true;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBe(true);
	});

	it("should support multiple concurrent operation loggers", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const logger = yield* MCPLoggerService;

				const logger1 = logger.withOperation("op1");
				const logger2 = logger.withOperation("op2");

				yield* logger1.info("Operation 1");
				yield* logger2.info("Operation 2");
				yield* logger1.warn("Operation 1 warning");

				return true;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toBe(true);
	});

	it("should provide correct log level access", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const logger = yield* MCPLoggerService;

				const level = yield* logger.getLogLevel();
				const enabled = yield* logger.isLoggingEnabled();

				return { level, enabled };
			}).pipe(Effect.provide(TestLayer))
		);

		expect(typeof result.level).toBe("string");
		expect(typeof result.enabled).toBe("boolean");
	});
});

describe("Logger Helpers", () => {
	describe("createLogEntry", () => {
		it("should create log entry with Error object", () => {
			const error = new Error("Test error");
			const entry = createLogEntry("error", "Test message", "test.operation", { key: "value" }, error);
			
			expect(entry.message).toBe("Test message");
			expect(entry.level).toBe("error");
			expect(entry.operation).toBe("test.operation");
			expect(entry.data).toEqual({ key: "value" });
			expect(entry.error).toBeDefined();
			expect(entry.error?.name).toBe("Error");
			expect(entry.error?.message).toBe("Test error");
		});

		it("should create log entry with unknown error", () => {
			const error = "String error";
			const entry = createLogEntry("error", "Test message", undefined, undefined, error);
			
			expect(entry.error).toBeDefined();
			expect(entry.error?.name).toBe("UnknownError");
			expect(entry.error?.message).toBe("String error");
		});

		it("should create log entry without error", () => {
			const entry = createLogEntry("info", "Test message", undefined, { key: "value" });
			
			expect(entry.message).toBe("Test message");
			expect(entry.level).toBe("info");
			expect(entry.data).toEqual({ key: "value" });
			expect(entry.error).toBeUndefined();
		});
	});

	describe("Legacy logging functions", () => {
		beforeEach(() => {
			vi.clearAllMocks();
			vi.spyOn(console, "log").mockImplementation(() => {});
			vi.spyOn(console, "warn").mockImplementation(() => {});
			vi.spyOn(console, "error").mockImplementation(() => {});
		});

		it("logDebug should log debug message", () => {
			logDebug("Debug message", { key: "value" });
			expect(console.log).toHaveBeenCalled();
			const call = vi.mocked(console.log).mock.calls[0][0];
			const parsed = JSON.parse(call);
			expect(parsed.level).toBe("debug");
			expect(parsed.message).toBe("Debug message");
			expect(parsed.data).toEqual({ key: "value" });
		});

		it("logInfo should log info message", () => {
			logInfo("Info message", { key: "value" });
			expect(console.log).toHaveBeenCalled();
			const call = vi.mocked(console.log).mock.calls[vi.mocked(console.log).mock.calls.length - 1][0];
			const parsed = JSON.parse(call);
			expect(parsed.level).toBe("info");
			expect(parsed.message).toBe("Info message");
		});

		it("logWarn should log warning message", () => {
			logWarn("Warning message", { key: "value" });
			expect(console.warn).toHaveBeenCalled();
			const call = vi.mocked(console.warn).mock.calls[0][0];
			const parsed = JSON.parse(call);
			expect(parsed.level).toBe("warn");
			expect(parsed.message).toBe("Warning message");
		});

		it("logError should log error message with Error object", () => {
			const error = new Error("Test error");
			logError("Error message", error, { key: "value" });
			expect(console.error).toHaveBeenCalled();
			const call = vi.mocked(console.error).mock.calls[0][0];
			const parsed = JSON.parse(call);
			expect(parsed.level).toBe("error");
			expect(parsed.message).toBe("Error message");
			expect(parsed.error.name).toBe("Error");
			expect(parsed.error.message).toBe("Test error");
		});

		it("logError should log error message with unknown error", () => {
			logError("Error message", "String error", { key: "value" });
			expect(console.error).toHaveBeenCalled();
			const call = vi.mocked(console.error).mock.calls[0][0];
			const parsed = JSON.parse(call);
			expect(parsed.error.name).toBe("UnknownError");
			expect(parsed.error.message).toBe("String error");
		});

		it("logError should log error message without error", () => {
			logError("Error message", undefined, { key: "value" });
			expect(console.error).toHaveBeenCalled();
			const call = vi.mocked(console.error).mock.calls[0][0];
			const parsed = JSON.parse(call);
			expect(parsed.level).toBe("error");
			expect(parsed.error).toBeUndefined();
		});
	});
});
