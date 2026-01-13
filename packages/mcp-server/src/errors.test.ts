import { describe, expect, it } from "vitest";
import {
	AuthenticationError,
	AuthorizationError,
	CacheError,
	ConfigurationError,
	MetricsError,
	PatternLoadError,
	PatternNotFoundError,
	PatternValidationError,
	RateLimitError,
	RequestValidationError,
	ResponseError,
	ServerError,
	TimeoutError,
	TracingError,
	ValidationError,
} from "./errors";

describe("Error Types", () => {
	describe("AuthenticationError", () => {
		it("should create with required fields", () => {
			const error = new AuthenticationError({
				message: "Invalid API key",
			});

			expect(error._tag).toBe("AuthenticationError");
			expect(error.message).toBe("Invalid API key");
			expect(error.providedKey).toBeUndefined();
		});

		it("should create with optional providedKey", () => {
			const error = new AuthenticationError({
				message: "Invalid API key",
				providedKey: "test-key",
			});

			expect(error.providedKey).toBe("test-key");
		});
	});

	describe("AuthorizationError", () => {
		it("should create with required fields", () => {
			const error = new AuthorizationError({
				message: "Insufficient permissions",
			});

			expect(error._tag).toBe("AuthorizationError");
			expect(error.message).toBe("Insufficient permissions");
		});

		it("should create with optional fields", () => {
			const error = new AuthorizationError({
				message: "Insufficient permissions",
				userId: "user-123",
				requiredRole: "admin",
			});

			expect(error.userId).toBe("user-123");
			expect(error.requiredRole).toBe("admin");
		});
	});

	describe("PatternNotFoundError", () => {
		it("should create with patternId", () => {
			const error = new PatternNotFoundError({
				patternId: "non-existent-pattern",
			});

			expect(error._tag).toBe("PatternNotFoundError");
			expect(error.patternId).toBe("non-existent-pattern");
		});
	});

	describe("PatternLoadError", () => {
		it("should create with filePath and cause", () => {
			const cause = new Error("File not found");
			const error = new PatternLoadError({
				filePath: "/path/to/pattern.json",
				cause,
			});

			expect(error._tag).toBe("PatternLoadError");
			expect(error.filePath).toBe("/path/to/pattern.json");
			expect(error.cause).toBe(cause);
		});
	});

	describe("PatternValidationError", () => {
		it("should create with errors array", () => {
			const errors = [
				{ field: "title", message: "Required", actual: undefined },
				{ field: "category", message: "Invalid", actual: "invalid" },
			];

			const error = new PatternValidationError({
				patternId: "test-pattern",
				errors,
			});

			expect(error._tag).toBe("PatternValidationError");
			expect(error.patternId).toBe("test-pattern");
			expect(error.errors).toEqual(errors);
		});
	});

	describe("RateLimitError", () => {
		it("should create with rate limit details", () => {
			const resetTime = new Date();
			const error = new RateLimitError({
				identifier: "user-123",
				limit: 100,
				windowMs: 60000,
				resetTime,
			});

			expect(error._tag).toBe("RateLimitError");
			expect(error.identifier).toBe("user-123");
			expect(error.limit).toBe(100);
			expect(error.windowMs).toBe(60000);
			expect(error.resetTime).toBe(resetTime);
		});
	});

	describe("ValidationError", () => {
		it("should create with validation details", () => {
			const error = new ValidationError({
				field: "email",
				message: "Invalid email format",
				value: "invalid-email",
			});

			expect(error._tag).toBe("ValidationError");
			expect(error.field).toBe("email");
			expect(error.message).toBe("Invalid email format");
			expect(error.value).toBe("invalid-email");
		});
	});

	describe("RequestValidationError", () => {
		it("should create with request validation details", () => {
			const errors = [
				{ field: "query", message: "Missing required parameter", actual: undefined }
			];

			const error = new RequestValidationError({
				endpoint: "/api/patterns",
				errors,
			});

			expect(error._tag).toBe("RequestValidationError");
			expect(error.endpoint).toBe("/api/patterns");
			expect(error.errors).toEqual(errors);
		});
	});

	describe("ResponseError", () => {
		it("should create with response details", () => {
			const error = new ResponseError({
				statusCode: 500,
				message: "Internal server error",
			});

			expect(error._tag).toBe("ResponseError");
			expect(error.statusCode).toBe(500);
			expect(error.message).toBe("Internal server error");
		});
	});

	describe("TracingError", () => {
		it("should create with tracing details", () => {
			const error = new TracingError({
				operation: "trace-operation",
				cause: new Error("Tracing service unavailable"),
			});

			expect(error._tag).toBe("TracingError");
			expect(error.operation).toBe("trace-operation");
			expect(error.cause).toBeInstanceOf(Error);
		});
	});

	describe("CacheError", () => {
		it("should create with cache details", () => {
			const error = new CacheError({
				operation: "get",
				key: "test-key",
				cause: new Error("Cache service unavailable"),
			});

			expect(error._tag).toBe("CacheError");
			expect(error.operation).toBe("get");
			expect(error.key).toBe("test-key");
			expect(error.cause).toBeInstanceOf(Error);
		});
	});

	describe("MetricsError", () => {
		it("should create with metrics details", () => {
			const error = new MetricsError({
				operation: "increment-counter",
				cause: new Error("Metrics service unavailable"),
			});

			expect(error._tag).toBe("MetricsError");
			expect(error.operation).toBe("increment-counter");
			expect(error.cause).toBeInstanceOf(Error);
		});
	});

	describe("ServerError", () => {
		it("should create with server details", () => {
			const error = new ServerError({
				message: "Database connection failed",
				cause: new Error("Connection timeout"),
			});

			expect(error._tag).toBe("ServerError");
			expect(error.message).toBe("Database connection failed");
			expect(error.cause).toBeInstanceOf(Error);
		});
	});

	describe("TimeoutError", () => {
		it("should create with timeout details", () => {
			const error = new TimeoutError({
				operation: "database-query",
				timeoutMs: 5000,
			});

			expect(error._tag).toBe("TimeoutError");
			expect(error.operation).toBe("database-query");
			expect(error.timeoutMs).toBe(5000);
		});
	});

	describe("ConfigurationError", () => {
		it("should create with configuration details", () => {
			const error = new ConfigurationError({
				key: "DATABASE_URL",
				expected: "postgresql://...",
				received: "invalid-url",
			});

			expect(error._tag).toBe("ConfigurationError");
			expect(error.key).toBe("DATABASE_URL");
			expect(error.expected).toBe("postgresql://...");
			expect(error.received).toBe("invalid-url");
		});
	});
});
