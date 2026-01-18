/**
 * Publish Service tests
 */

import { FileSystem } from "@effect/platform";
import { Effect, Layer } from "effect";
import { MdxService } from "effect-mdx";
import { describe, expect, it } from "vitest";
import { PublishServiceLive } from "../service.js";
import type { ValidatorConfig } from "../validator.js";
import { summarizeResults, validatePattern } from "../validator.js";

describe("Publish Service", () => {
	describe("Validator", () => {
		const mockConfig: ValidatorConfig = {
			publishedDir: "pub",
			srcDir: "src",
			concurrency: 2
		};

		it("should validate a correct pattern", async () => {
			const mockMdx = Layer.succeed(MdxService, {
				readMdxAndFrontmatter: (path: string) => Effect.succeed({
					frontmatter: {
						id: "test",
						title: "Test",
						skillLevel: "beginner",
						useCase: "core-concepts",
						summary: "A short summary"
					},
					mdxBody: "## Good Example\n## Anti-Pattern\n## Explanation"
				})
			} as any);

			const mockFS = Layer.succeed(FileSystem.FileSystem, {
				exists: () => Effect.succeed(true)
			} as any);

			const layers = Layer.merge(mockMdx, mockFS);
			const result = await Effect.runPromise(
				validatePattern("pub/test.mdx", mockConfig).pipe(Effect.provide(layers))
			);

			expect(result.valid).toBe(true);
			expect(result.errors).toBe(0);
		});

		it("should handle invalid use cases with warnings", async () => {
			const mockMdx = Layer.succeed(MdxService, {
				readMdxAndFrontmatter: () => Effect.succeed({
					frontmatter: {
						id: "test",
						title: "Test",
						skillLevel: "beginner",
						useCase: "invalid-use-case",
						summary: "Summary"
					},
					mdxBody: "## Good Example\n## Anti-Pattern\n## Explanation"
				})
			} as any);

			const mockFS = Layer.succeed(FileSystem.FileSystem, {
				exists: () => Effect.succeed(true)
			} as any);

			const layers = Layer.merge(mockMdx, mockFS);
			const result = await Effect.runPromise(
				validatePattern("pub/test.mdx", mockConfig).pipe(Effect.provide(layers))
			);

			expect(result.valid).toBe(true); // Warnings don't make it invalid
			expect(result.warnings).toBeGreaterThan(0);
		});

		it("should summarize results correctly", () => {
			const results = [
				{ valid: true, errors: 0, warnings: 1 },
				{ valid: false, errors: 1, warnings: 0 }
			];
			const summary = summarizeResults(results as any);
			expect(summary.total).toBe(2);
			expect(summary.valid).toBe(1);
			expect(summary.totalErrors).toBe(1);
		});
	});

	describe("PublishServiceLive Stub", () => {
		it("should provide service methods (stubs)", async () => {
			const program = Effect.gen(function* () {
				const service = yield* PublishServiceLive;
				return yield* service.validatePattern("test.mdx", {} as any);
			});

			const result = await Effect.runPromise(program.pipe(Effect.provide(PublishServiceLive.Default)));
			expect(result.valid).toBe(true);
		});
	});
});
