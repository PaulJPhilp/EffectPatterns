/**
 * MCP Validation Service Tests
 */

import { Effect, Either, Layer, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { ValidationError } from "../errors";
import { MCPConfigService } from "./config";
import { MCPLoggerService } from "./logger";
import {
	MCPValidationService,
	validatePatternId,
	validateSkillLevel,
} from "./validation.js";

process.env.PATTERN_API_KEY = "test-api-key";

const TestLayer = Layer.provide(
	MCPValidationService.Default,
	Layer.provide(MCPLoggerService.Default, Layer.provide(MCPConfigService.Default, Layer.empty))
);

describe("MCPValidationService", () => {
	describe("validatePatternSearch", () => {
		it("should validate valid pattern search request", async () => {
			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const validation = yield* MCPValidationService;
					return yield* validation.validatePatternSearch({
						method: "GET",
						path: "/api/patterns",
						query: {
							query: "test",
							skillLevel: "beginner",
							limit: "10",
						},
					});
				}).pipe(Effect.provide(TestLayer))
			);

			expect(result.query).toBe("test");
			expect(result.skillLevel).toBe("beginner");
			expect(result.limit).toBe(10);
		});

		it("should reject invalid skill level", async () => {
			const either = await Effect.runPromise(
				Effect.gen(function* () {
					const validation = yield* MCPValidationService;
					return yield* validation.validatePatternSearch({
						method: "GET",
						path: "/api/patterns",
						query: { skillLevel: "invalid" },
					});
				}).pipe(Effect.either, Effect.provide(TestLayer))
			);

			expect(Either.isLeft(either)).toBe(true);
			if (Either.isLeft(either)) {
				expect(either.left).toBeInstanceOf(ValidationError);
				expect(either.left.message).toContain("Must be one of:");
			}
		});

		it("should reject limit out of range", async () => {
			const either = await Effect.runPromise(
				Effect.gen(function* () {
					const validation = yield* MCPValidationService;
					return yield* validation.validatePatternSearch({
						method: "GET",
						path: "/api/patterns",
						query: { limit: "1000" },
					});
				}).pipe(Effect.either, Effect.provide(TestLayer))
			);

			expect(Either.isLeft(either)).toBe(true);
			if (Either.isLeft(either)) {
				expect(either.left).toBeInstanceOf(ValidationError);
				expect(either.left.message).toContain("Must be between");
			}
		});

		it("should handle array use case", async () => {
			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const validation = yield* MCPValidationService;
					return yield* validation.validatePatternSearch({
						method: "GET",
						path: "/api/patterns",
						query: { useCase: ["validation", "testing"] },
					});
				}).pipe(Effect.provide(TestLayer))
			);

			expect(result.useCase).toEqual(["validation", "testing"]);
		});

		it("should handle string use case", async () => {
			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const validation = yield* MCPValidationService;
					return yield* validation.validatePatternSearch({
						method: "GET",
						path: "/api/patterns",
						query: { useCase: "validation" },
					});
				}).pipe(Effect.provide(TestLayer))
			);

			expect(result.useCase).toEqual(["validation"]);
		});

		it("should reject invalid use case type", async () => {
			const either = await Effect.runPromise(
				Effect.gen(function* () {
					const validation = yield* MCPValidationService;
					return yield* validation.validatePatternSearch({
						method: "GET",
						path: "/api/patterns",
						query: { useCase: 123 },
					});
				}).pipe(Effect.either, Effect.provide(TestLayer))
			);

			expect(Either.isLeft(either)).toBe(true);
			if (Either.isLeft(either)) {
				expect(either.left).toBeInstanceOf(ValidationError);
				expect(either.left.message).toContain("Must be a string or array of strings");
			}
		});

		it("should reject negative offset", async () => {
			const either = await Effect.runPromise(
				Effect.gen(function* () {
					const validation = yield* MCPValidationService;
					return yield* validation.validatePatternSearch({
						method: "GET",
						path: "/api/patterns/search",
						query: { offset: "-1" },
					});
				}).pipe(Effect.either, Effect.provide(TestLayer))
			);

			expect(Either.isLeft(either)).toBe(true);
			if (Either.isLeft(either)) {
				expect(either.left).toBeInstanceOf(ValidationError);
				expect(either.left.message).toContain("non-negative");
			}
		});

		it("should reject query longer than 500 characters", async () => {
			const longQuery = "a".repeat(501);
			const either = await Effect.runPromise(
				Effect.gen(function* () {
					const validation = yield* MCPValidationService;
					return yield* validation.validatePatternSearch({
						method: "GET",
						path: "/api/patterns/search",
						query: { query: longQuery },
					});
				}).pipe(Effect.either, Effect.provide(TestLayer))
			);

			expect(Either.isLeft(either)).toBe(true);
			if (Either.isLeft(either)) {
				expect(either.left).toBeInstanceOf(ValidationError);
				expect(either.left.message).toContain("500 characters");
			}
		});
	});

	describe("validatePatternRetrieval", () => {
		it("should validate valid pattern ID", async () => {
			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const validation = yield* MCPValidationService;
					return yield* validation.validatePatternRetrieval({
						method: "GET",
						path: "/api/patterns/valid-pattern-id",
					});
				}).pipe(Effect.provide(TestLayer))
			);

			expect(result.id).toBe("valid-pattern-id");
		});

		it("should reject missing ID", async () => {
			const either = await Effect.runPromise(
				Effect.gen(function* () {
					const validation = yield* MCPValidationService;
					return yield* validation.validatePatternRetrieval({
						method: "GET",
						path: "/api/patterns/",
					});
				}).pipe(Effect.either, Effect.provide(TestLayer))
			);

			expect(Either.isLeft(either)).toBe(true);
			if (Either.isLeft(either)) {
				expect(either.left).toBeInstanceOf(ValidationError);
				expect(either.left.message).toContain("required");
			}
		});

		it("should reject invalid ID format", async () => {
			const either = await Effect.runPromise(
				Effect.gen(function* () {
					const validation = yield* MCPValidationService;
					return yield* validation.validatePatternRetrieval({
						method: "GET",
						path: "/api/patterns/Invalid_ID",
					});
				}).pipe(Effect.either, Effect.provide(TestLayer))
			);

			expect(Either.isLeft(either)).toBe(true);
			if (Either.isLeft(either)) {
				expect(either.left).toBeInstanceOf(ValidationError);
				expect(either.left.message).toContain("kebab-case");
			}
		});

		it("should reject ID that is too short", async () => {
			const either = await Effect.runPromise(
				Effect.gen(function* () {
					const validation = yield* MCPValidationService;
					return yield* validation.validatePatternRetrieval({
						method: "GET",
						path: "/api/patterns/aa",
					});
				}).pipe(Effect.either, Effect.provide(TestLayer))
			);

			expect(Either.isLeft(either)).toBe(true);
			if (Either.isLeft(either)) {
				expect(either.left).toBeInstanceOf(ValidationError);
				expect(either.left.message).toContain("between 3 and 100");
			}
		});
	});

	describe("validateRequest", () => {
		it("should reject request when API key is missing", async () => {
			const either = await Effect.runPromise(
				Effect.gen(function* () {
					const validation = yield* MCPValidationService;
					return yield* validation.validateRequest({
						method: "GET",
						path: "/api/patterns/search",
						headers: { "user-agent": "vitest" },
					});
				}).pipe(Effect.either, Effect.provide(TestLayer))
			);

			expect(Either.isLeft(either)).toBe(true);
			if (Either.isLeft(either)) {
				expect(either.left).toBeInstanceOf(ValidationError);
				expect(either.left.message).toContain("API key");
			}
		});

		it("should accept request when requireApiKey=false", async () => {
			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const validation = yield* MCPValidationService;
					return yield* validation.validateRequest(
						{
							method: "GET",
							path: "/api/patterns/search",
							headers: { "user-agent": "vitest" },
							query: { query: "ok" },
						},
						false
					);
				}).pipe(Effect.provide(TestLayer))
			);

			expect("query" in result).toBe(true);
			if ("query" in result) {
				expect(result.query).toBe("ok");
			}
		});

		it("should reject invalid request path", async () => {
			const either = await Effect.runPromise(
				Effect.gen(function* () {
					const validation = yield* MCPValidationService;
					return yield* validation.validateRequest(
						{
							method: "GET",
							path: "/api/unknown",
							headers: {
								"x-api-key": "test-api-key",
								"user-agent": "vitest",
							},
						},
						true
					);
				}).pipe(Effect.either, Effect.provide(TestLayer))
			);

			expect(Either.isLeft(either)).toBe(true);
			if (Either.isLeft(either)) {
				expect(either.left).toBeInstanceOf(ValidationError);
				expect(either.left.message).toContain("Invalid request path");
			}
		});
	});

	describe("validateRequestHeaders", () => {
		it("should reject missing user-agent", async () => {
			const either = await Effect.runPromise(
				Effect.gen(function* () {
					const validation = yield* MCPValidationService;
					return yield* validation.validateRequestHeaders({
						"content-type": "application/json",
					});
				}).pipe(Effect.either, Effect.provide(TestLayer))
			);

			expect(Either.isLeft(either)).toBe(true);
			if (Either.isLeft(either)) {
				expect(either.left).toBeInstanceOf(ValidationError);
				expect(either.left.message).toContain("User-Agent");
			}
		});

		it("should reject non-json content-type", async () => {
			const either = await Effect.runPromise(
				Effect.gen(function* () {
					const validation = yield* MCPValidationService;
					return yield* validation.validateRequestHeaders({
						"user-agent": "vitest",
						"content-type": "text/plain",
					});
				}).pipe(Effect.either, Effect.provide(TestLayer))
			);

			expect(Either.isLeft(either)).toBe(true);
			if (Either.isLeft(either)) {
				expect(either.left).toBeInstanceOf(ValidationError);
				expect(either.left.message).toContain("application/json");
			}
		});
	});

	describe("validateRequestBodySize", () => {
		it("should reject invalid content-length header", async () => {
			const either = await Effect.runPromise(
				Effect.gen(function* () {
					const validation = yield* MCPValidationService;
					return yield* validation.validateRequestBodySize(
						{ hello: "world" },
						{ "content-length": "nope" }
					);
				}).pipe(Effect.either, Effect.provide(TestLayer))
			);

			expect(Either.isLeft(either)).toBe(true);
			if (Either.isLeft(either)) {
				expect(either.left).toBeInstanceOf(ValidationError);
				expect(either.left.message).toContain("content-length");
			}
		});
	});

	describe("validateSchema", () => {
		it("should fail schema validation for wrong type", async () => {
			const either = await Effect.runPromise(
				Effect.gen(function* () {
					const validation = yield* MCPValidationService;
					const schema = Schema.String as unknown as Schema.Schema<
						unknown,
						string
					>;
					return yield* validation.validateSchema(
						schema,
						123,
						"test"
					);
				}).pipe(Effect.either, Effect.provide(TestLayer))
			);

			expect(Either.isLeft(either)).toBe(true);
			if (Either.isLeft(either)) {
				expect(either.left).toBeInstanceOf(ValidationError);
				expect(either.left.message).toContain("Schema validation failed");
			}
		});
	});

	describe("legacy helpers", () => {
		it("validatePatternId should accept kebab-case", () => {
			expect(validatePatternId("abc-123")).toBe(true);
		});

		it("validatePatternId should reject invalid formats", () => {
			expect(validatePatternId("Invalid_ID")).toBe(false);
			expect(validatePatternId("aa")).toBe(false);
		});

		it("validateSkillLevel should narrow valid values", () => {
			expect(validateSkillLevel("beginner")).toBe(true);
			expect(validateSkillLevel("nope")).toBe(false);
		});
	});
});
