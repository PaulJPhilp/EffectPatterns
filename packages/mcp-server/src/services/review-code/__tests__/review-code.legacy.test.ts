import { Cause, Effect, Option } from "effect";
import { describe, expect, it } from "vitest";
import { ReviewCodeService } from "../api";
import { FileSizeError, NonTypeScriptError } from "../errors";

describe("ReviewCodeService", () => {
	describe("reviewCode", () => {
		it("should return top 3 recommendations sorted by severity then line", async () => {
			const code = `
// Multiple issues for testing
const x: any = 1;  // Line 3 - high severity
const y: any = 2;  // Line 4 - high severity
const z: any = 3;  // Line 5 - high severity
console.log("test");  // Line 6 - medium severity
			`.trim();

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const service = yield* ReviewCodeService;
					return yield* service.reviewCode(code, "test.ts");
				}).pipe(Effect.provide(ReviewCodeService.Default))
			);

			expect(result.recommendations.length).toBeLessThanOrEqual(3);
			expect(result.recommendations.length).toBeGreaterThan(0);
			expect(result.meta.totalFound).toBeGreaterThanOrEqual(1);
			expect(result.meta.hiddenCount).toBeGreaterThanOrEqual(0);

			// Check that enhanced recommendations are also populated
			expect(result.enhancedRecommendations).toBeDefined();
			expect(result.enhancedRecommendations.length).toBeGreaterThan(0);

			expect(result.markdown).toContain("# Code Review Results");
			expect(result.markdown).toMatch(/🔴|🟡|🔵/);
		});

		it("should return all recommendations if less than 3 found", async () => {
			const code = `
import { Effect } from "effect";
export const goodCode = Effect.succeed(42);
			`.trim();

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const service = yield* ReviewCodeService;
					return yield* service.reviewCode(code, "test.ts");
				}).pipe(Effect.provide(ReviewCodeService.Default))
			);

			expect(result.recommendations.length).toBeLessThanOrEqual(3);
			expect(result.meta.hiddenCount).toBe(0);
			expect(result.meta.upgradeMessage).toBeUndefined();
		});

		it("should include upgrade message when more than 3 issues found", async () => {
			const code = `
const a: any = 1;
const b: any = 2;
const c: any = 3;
const d: any = 4;
const e: any = 5;
			`.trim();

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const service = yield* ReviewCodeService;
					return yield* service.reviewCode(code, "test.ts");
				}).pipe(Effect.provide(ReviewCodeService.Default))
			);

			expect(result.recommendations).toHaveLength(3);
			expect(result.meta.totalFound).toBeGreaterThan(3);
			expect(result.meta.hiddenCount).toBeGreaterThan(0);
			expect(result.meta.upgradeMessage).toContain("Use the HTTP API or CLI");
			expect(result.markdown).toContain("💡");
		});

		it("should reject files larger than 100KB", async () => {
			const largeCode = "x".repeat(101 * 1024);

			const result = await Effect.runPromiseExit(
				Effect.gen(function* () {
					const service = yield* ReviewCodeService;
					return yield* service.reviewCode(largeCode, "test.ts");
				}).pipe(Effect.provide(ReviewCodeService.Default))
			);

			expect(result._tag).toBe("Failure");
			if (result._tag === "Failure") {
				const error = Option.getOrThrow(Cause.failureOption(result.cause));
				expect(error).toBeInstanceOf(FileSizeError);
			}
		});

		it("should reject non-TypeScript files", async () => {
			const code = "const x = 1;";

			const result = await Effect.runPromiseExit(
				Effect.gen(function* () {
					const service = yield* ReviewCodeService;
					return yield* service.reviewCode(code, "test.js");
				}).pipe(Effect.provide(ReviewCodeService.Default))
			);

			expect(result._tag).toBe("Failure");
			if (result._tag === "Failure") {
				const error = Option.getOrThrow(Cause.failureOption(result.cause));
				expect(error).toBeInstanceOf(NonTypeScriptError);
			}
		});

		it("should accept .tsx files", async () => {
			const code = `
import { Effect } from "effect";
export const Component = () => Effect.succeed(<div>Hello</div>);
			`.trim();

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const service = yield* ReviewCodeService;
					return yield* service.reviewCode(code, "test.tsx");
				}).pipe(Effect.provide(ReviewCodeService.Default))
			);

			expect(result).toBeDefined();
			expect(result.recommendations).toBeDefined();
		});

		it("should handle code with no issues", async () => {
			const code = `
import { Effect } from "effect";
export const program = Effect.succeed(42);
			`.trim();

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const service = yield* ReviewCodeService;
					return yield* service.reviewCode(code, "test.ts");
				}).pipe(Effect.provide(ReviewCodeService.Default))
			);

			expect(result.recommendations.length).toBeLessThanOrEqual(3);
			expect(result.meta.upgradeMessage).toBeUndefined();
			expect(result.markdown).toBeDefined();
		});

		it("should generate proper Markdown with severity emojis", async () => {
			const code = `
const x: any = 1;
console.log("test");
			`.trim();

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const service = yield* ReviewCodeService;
					return yield* service.reviewCode(code, "test.ts");
				}).pipe(Effect.provide(ReviewCodeService.Default))
			);

			expect(result.markdown).toContain("# Code Review Results");
			expect(result.markdown).toMatch(/🔴|🟡|🔵/);
			expect(result.markdown).toContain("Summary");
			expect(result.markdown).toContain("Evidence");
		});

		it("should sort by severity first, then line number", async () => {
			const code = `
console.log("line 2");  // Medium severity
const x: any = 1;  // Line 3 - High severity
console.log("line 4");  // Medium severity
			`.trim();

			const result = await Effect.runPromise(
				Effect.gen(function* () {
					const service = yield* ReviewCodeService;
					return yield* service.reviewCode(code, "test.ts");
				}).pipe(Effect.provide(ReviewCodeService.Default))
			);

			if (result.recommendations.length >= 2) {
				const firstRec = result.recommendations[0];
				const secondRec = result.recommendations[1];

				if (firstRec.severity === secondRec.severity) {
					expect(firstRec.line).toBeLessThan(secondRec.line);
				} else {
					const severityRank = { high: 3, medium: 2, low: 1 };
					expect(severityRank[firstRec.severity]).toBeGreaterThanOrEqual(
						severityRank[secondRec.severity]
					);
				}
			}
		});
	});
});
