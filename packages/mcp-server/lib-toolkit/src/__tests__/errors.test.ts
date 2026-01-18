/**
 * Error Classes Tests (No Mocks)
 */

import { describe, expect, it } from "vitest";
import {
	CacheError,
	ConfigurationError,
	PatternLoadError,
	PatternNotFoundError,
	PatternValidationError,
	SearchError,
	ServiceUnavailableError,
	TemplateError
} from "../errors.js";

describe("Error Classes", () => {
	describe("ConfigurationError", () => {
		it("should create configuration error with required fields", () => {
			const error = new ConfigurationError({
				key: "testKey",
				expected: "string",
				received: 123
			});

			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(ConfigurationError);
			expect(error.key).toBe("testKey");
			expect(error.expected).toBe("string");
			expect(error.received).toBe(123);
			expect(error._tag).toBe("ConfigurationError");
		});
	});

	describe("PatternLoadError", () => {
		it("should create pattern load error with path and cause", () => {
			const cause = new Error("File not found");
			const error = new PatternLoadError({
				path: "/path/to/pattern.mdx",
				cause: cause
			});

			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(PatternLoadError);
			expect(error.path).toBe("/path/to/pattern.mdx");
			expect(error.cause).toBe(cause);
			expect(error._tag).toBe("PatternLoadError");
		});
	});

	describe("PatternValidationError", () => {
		it("should create pattern validation error", () => {
			const error = new PatternValidationError({
				patternId: "test-pattern",
				field: "skillLevel",
				message: "Invalid skill level",
				value: "expert"
			});

			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(PatternValidationError);
			expect(error.patternId).toBe("test-pattern");
			expect(error.field).toBe("skillLevel");
			expect(error.message).toBe("Invalid skill level");
			expect(error.value).toBe("expert");
			expect(error._tag).toBe("PatternValidationError");
		});
	});

	describe("SearchError", () => {
		it("should create search error with query and cause", () => {
			const cause = new Error("Index not available");
			const error = new SearchError({
				query: "test query",
				cause: cause
			});

			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(SearchError);
			expect(error.query).toBe("test query");
			expect(error.cause).toBe(cause);
			expect(error._tag).toBe("SearchError");
		});
	});

	describe("TemplateError", () => {
		it("should create template error", () => {
			const cause = new Error("Liquid syntax error");
			const error = new TemplateError({
				patternId: "test-pattern",
				operation: "render",
				cause: cause
			});

			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(TemplateError);
			expect(error.patternId).toBe("test-pattern");
			expect(error.operation).toBe("render");
			expect(error.cause).toBe(cause);
			expect(error._tag).toBe("TemplateError");
		});
	});

	describe("CacheError", () => {
		it("should create cache error", () => {
			const cause = new Error("Cache miss");
			const error = new CacheError({
				operation: "get",
				key: "test-key",
				cause: cause
			});

			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(CacheError);
			expect(error.operation).toBe("get");
			expect(error.key).toBe("test-key");
			expect(error.cause).toBe(cause);
			expect(error._tag).toBe("CacheError");
		});
	});

	describe("PatternNotFoundError", () => {
		it("should create pattern not found error", () => {
			const error = new PatternNotFoundError({
				patternId: "missing-pattern"
			});

			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(PatternNotFoundError);
			expect(error.patternId).toBe("missing-pattern");
			expect(error._tag).toBe("PatternNotFoundError");
		});
	});

	describe("ServiceUnavailableError", () => {
		it("should create service unavailable error", () => {
			const error = new ServiceUnavailableError({
				service: "DatabaseService",
				reason: "Connection timeout"
			});

			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(ServiceUnavailableError);
			expect(error.service).toBe("DatabaseService");
			expect(error.reason).toBe("Connection timeout");
			expect(error._tag).toBe("ServiceUnavailableError");
		});
	});

	describe("Error Properties", () => {
		it("should have proper stack traces", () => {
			const error = new ConfigurationError({
				key: "test",
				expected: "string",
				received: "number"
			});

			expect(error.stack).toBeDefined();
			expect(typeof error.stack).toBe("string");
		});

		it("should be serializable", () => {
			const error = new PatternLoadError({
				path: "/test/path",
				cause: "Test error"
			});

			const json = JSON.stringify(error);
			const parsed = JSON.parse(json);

			expect(parsed._tag).toBe("PatternLoadError");
			expect(parsed.path).toBe("/test/path");
			expect(parsed.cause).toBe("Test error");
		});
	});
});
