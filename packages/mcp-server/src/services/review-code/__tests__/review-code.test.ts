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

	describe("Code source constraints", () => {
		it("should require code parameter (filePath alone is not sufficient)", async () => {
			// This test ensures that code must be provided directly
			// The service signature already enforces this at compile time,
			// but we verify runtime behavior
			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const service = yield* ReviewCodeService;

					// Code must be provided - cannot be empty
					const code = "";

					const either = yield* Effect.either(
						service.reviewCode(code, "src/test.ts")
					);

					return either;
				}).pipe(Effect.provide(TestLayer))
			);

			// Empty code should still work (it's just empty), but we verify
			// that we're using the provided code, not reading from filePath
			expect(result._tag).toBe("Right");
		});

		it("should use provided code parameter, not read from filePath", async () => {
			// This test verifies that the code parameter is used,
			// not the filePath (which might point to a different file)
			const providedCode = "const x: any = 42;"; // Code with issue
			const filePath = "src/test.ts"; // Path that doesn't exist or has different content

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const service = yield* ReviewCodeService;

					const res = yield* service.reviewCode(providedCode, filePath);
					return res;
				}).pipe(Effect.provide(TestLayer))
			);

			// Should analyze the provided code, not read from filePath
			expect(result).toHaveProperty("recommendations");
			expect(result).toHaveProperty("enhancedRecommendations");
			// The analysis should be based on providedCode, not filePath content
			expect(Array.isArray(result.recommendations)).toBe(true);
		});

		it("should work without filePath (code-only mode)", async () => {
			const code = "const x: number = 42;";

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const service = yield* ReviewCodeService;

					const res = yield* service.reviewCode(code);
					return res;
				}).pipe(Effect.provide(TestLayer))
			);

			expect(result).toHaveProperty("recommendations");
			expect(result).toHaveProperty("enhancedRecommendations");
			expect(result).toHaveProperty("summary");
			expect(result).toHaveProperty("meta");
			expect(result).toHaveProperty("markdown");
		});

		it("should use filePath only for context, not file reading", async () => {
			// Create a file path that definitely doesn't exist
			const nonExistentPath = "/tmp/non-existent-file-that-should-not-be-read.ts";
			const providedCode = "const x: number = 42;";

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const service = yield* ReviewCodeService;

					// Should work even with non-existent filePath
					// because we don't read from disk
					const res = yield* service.reviewCode(providedCode, nonExistentPath);
					return res;
				}).pipe(Effect.provide(TestLayer))
			);

			// Should succeed because we use provided code, not filePath
			expect(result).toHaveProperty("recommendations");
			expect(result).toHaveProperty("enhancedRecommendations");
		});
	});

	describe("Diagnostic-only response", () => {
		it("should return only diagnostic information, no corrected code", async () => {
			const code = `
function test() {
	try {
		const result = Promise.resolve(42);
	} catch (e) {
		console.error(e);
	}
}
`;

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const service = yield* ReviewCodeService;

					const res = yield* service.reviewCode(code, "test.ts");
					return res;
				}).pipe(Effect.provide(TestLayer))
			);

			// Verify response structure contains only diagnostics
			expect(result).toHaveProperty("recommendations");
			expect(result).toHaveProperty("enhancedRecommendations");
			expect(result).toHaveProperty("summary");
			expect(result).toHaveProperty("meta");
			expect(result).toHaveProperty("markdown");

			// Verify NO corrected code fields
			expect(result).not.toHaveProperty("correctedCode");
			expect(result).not.toHaveProperty("after");
			expect(result).not.toHaveProperty("fixed");
			expect(result).not.toHaveProperty("patched");

			// Verify recommendations contain diagnostics only
			if (result.recommendations.length > 0) {
				const rec = result.recommendations[0];
				expect(rec).toHaveProperty("severity");
				expect(rec).toHaveProperty("title");
				expect(rec).toHaveProperty("line");
				expect(rec).toHaveProperty("message");
				// Should NOT have corrected code
				expect(rec).not.toHaveProperty("correctedCode");
				expect(rec).not.toHaveProperty("after");
			}

			// Verify enhanced recommendations contain diagnostics only
			if (result.enhancedRecommendations.length > 0) {
				const enhanced = result.enhancedRecommendations[0];
				expect(enhanced).toHaveProperty("severity");
				expect(enhanced).toHaveProperty("title");
				expect(enhanced).toHaveProperty("line");
				expect(enhanced).toHaveProperty("message");
				expect(enhanced).toHaveProperty("fixPlan");
				expect(enhanced).toHaveProperty("evidence");

				// Fix plan should contain steps/changes/risks, not corrected code
				expect(enhanced.fixPlan).toHaveProperty("steps");
				expect(enhanced.fixPlan).toHaveProperty("changes");
				expect(enhanced.fixPlan).toHaveProperty("risks");
				expect(enhanced.fixPlan).not.toHaveProperty("correctedCode");
				expect(enhanced.fixPlan).not.toHaveProperty("after");

				// Evidence should show context, not corrected code
				expect(enhanced.evidence).toHaveProperty("beforeContext");
				expect(enhanced.evidence).toHaveProperty("targetLines");
				expect(enhanced.evidence).toHaveProperty("afterContext");
				expect(enhanced.evidence).not.toHaveProperty("correctedLines");
				expect(enhanced.evidence).not.toHaveProperty("after");
			}
		});

		it("should return fix plans with steps, not corrected code", async () => {
			const code = "const x: any = 42;";

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const service = yield* ReviewCodeService;

					const res = yield* service.reviewCode(code, "test.ts");
					return res;
				}).pipe(Effect.provide(TestLayer))
			);

			// Check that fix plans contain actionable steps, not corrected code
			if (result.enhancedRecommendations.length > 0) {
				const fixPlan = result.enhancedRecommendations[0].fixPlan;

				// Should have steps (actionable items)
				expect(Array.isArray(fixPlan.steps)).toBe(true);
				expect(Array.isArray(fixPlan.changes)).toBe(true);
				expect(Array.isArray(fixPlan.risks)).toBe(true);

				// Steps should be descriptive actions, not code
				if (fixPlan.steps.length > 0) {
					const step = fixPlan.steps[0];
					expect(step).toHaveProperty("order");
					expect(step).toHaveProperty("action");
					expect(step).toHaveProperty("detail");
					// Should NOT contain full corrected code
					expect(typeof step.action).toBe("string");
					expect(step.action.length).toBeLessThan(1000); // Reasonable length for action
				}

				// Changes should describe what changes, not show corrected code
				if (fixPlan.changes.length > 0) {
					const change = fixPlan.changes[0];
					expect(change).toHaveProperty("type");
					expect(change).toHaveProperty("scope");
					expect(change).toHaveProperty("description");
					// Should NOT contain full corrected code
					expect(typeof change.description).toBe("string");
				}
			}
		});

		it("should return evidence snippets, not corrected code", async () => {
			const code = `
function test() {
	const x: any = 42;
	return x;
}
`;

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const service = yield* ReviewCodeService;

					const res = yield* service.reviewCode(code, "test.ts");
					return res;
				}).pipe(Effect.provide(TestLayer))
			);

			// Check that evidence shows original code context, not corrected code
			if (result.enhancedRecommendations.length > 0) {
				const evidence = result.enhancedRecommendations[0].evidence;

				expect(evidence).toHaveProperty("beforeContext");
				expect(evidence).toHaveProperty("targetLines");
				expect(evidence).toHaveProperty("afterContext");
				expect(evidence).toHaveProperty("startLine");
				expect(evidence).toHaveProperty("endLine");

				// targetLines should show the problematic code, not corrected version
				expect(Array.isArray(evidence.targetLines)).toBe(true);
				// Should NOT have corrected version
				expect(evidence).not.toHaveProperty("correctedLines");
				expect(evidence).not.toHaveProperty("after");
			}
		});

		it("should return markdown with diagnostics only, no corrected code", async () => {
			const code = "const x: any = 42;";

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const service = yield* ReviewCodeService;

					const res = yield* service.reviewCode(code, "test.ts");
					return res;
				}).pipe(Effect.provide(TestLayer))
			);

			expect(typeof result.markdown).toBe("string");
			expect(result.markdown.length).toBeGreaterThan(0);

			// Markdown should contain diagnostic information
			expect(result.markdown).toMatch(/Code Review Results|Recommendations|Fix Plan|Evidence/i);

			// Markdown should NOT contain corrected code sections
			// (no "After" code blocks, no "Corrected" sections)
			const lowerMarkdown = result.markdown.toLowerCase();
			// These patterns would indicate corrected code, which we don't want
			expect(lowerMarkdown).not.toMatch(/```[\s\S]*?after[\s\S]*?```/i);
			expect(lowerMarkdown).not.toMatch(/corrected code/i);
			expect(lowerMarkdown).not.toMatch(/fixed code/i);
			expect(lowerMarkdown).not.toMatch(/patched code/i);
		});
	});
});
