import { describe, it, expect } from "vitest";
import { ReviewCodeService } from "../api";
import { Effect, Layer } from "effect";
import { FileSizeError, NonTypeScriptError } from "../errors";
import { MCPConfigService } from "../../config";
import { MCPLoggerService } from "../../logger";

const TestLayer = Layer.provideMerge(
	ReviewCodeService.Default,
	Layer.provideMerge(
		MCPLoggerService.Default,
		MCPConfigService.Default
	)
);

describe("ReviewCodeService", () => {
	it("should reject files larger than max size", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const service = yield* ReviewCodeService;

		// Create code that exceeds MAX_FILE_SIZE_BYTES (100KB)
		const largeCode = "x".repeat(101 * 1024);

		const either = yield* Effect.either(
			service.reviewCode(largeCode)
		);

		return either;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result._tag).toBe("Left");
		if (result._tag === "Left" && result.left instanceof FileSizeError) {
			expect(result.left._tag).toBe("FileSizeError");
		}
	});

	it("should reject non-TypeScript files", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const service = yield* ReviewCodeService;

				const either = yield* Effect.either(
					service.reviewCode("console.log('test');", "file.js")
				);

				return either;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result._tag).toBe("Left");
		if (result._tag === "Left" && result.left instanceof NonTypeScriptError) {
			expect(result.left._tag).toBe("NonTypeScriptError");
		}
	});

	it("should return review result for valid TypeScript", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const service = yield* ReviewCodeService;

				const code = `
function test() {
	try {
		const result = Promise.resolve(42);
	} catch (e) {
		console.error(e);
	}
}
`;

				const res = yield* service.reviewCode(code, "test.ts");
				return res;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toHaveProperty("recommendations");
		expect(result).toHaveProperty("enhancedRecommendations");
		expect(result).toHaveProperty("summary");
		expect(result).toHaveProperty("meta");
		expect(result).toHaveProperty("markdown");
	});

	it("should handle files without explicit path", async () => {
		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const service = yield* ReviewCodeService;

				const code = "const x: number = 42;";

				const res = yield* service.reviewCode(code);
				return res;
			}).pipe(Effect.provide(TestLayer))
		);

		expect(result).toHaveProperty("recommendations");
		expect(result).toHaveProperty("markdown");
	});
});
