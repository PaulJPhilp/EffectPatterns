/**
 * Ingest Pipeline tests
 */

import { FileSystem } from "@effect/platform";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { checkDuplicates, discoverPatterns, generateReport, validatePattern } from "../pipeline.js";
import type { IngestConfig } from "../types.js";

describe("Ingest Pipeline", () => {
	const mockConfig: IngestConfig = {
		srcDir: "src",
		rawDir: "raw",
		processedDir: "proc",
		targetPublishedDir: "pub",
		publishedDir: "pub",
		reportDir: "reports"
	};

	describe("discoverPatterns", () => {
		it("should discover patterns and extract TypeScript", async () => {
			const mockFS = Layer.succeed(FileSystem.FileSystem, {
				makeDirectory: () => Effect.void,
				readDirectory: () => Effect.succeed(["pattern.mdx"]),
				readFileString: () => Effect.succeed("---\ntitle: Test\n---\n## Good Example\n```typescript\nconst x = 1;\n```"),
				writeFileString: () => Effect.void
			} as any);

			const patterns = await Effect.runPromise(
				discoverPatterns(mockConfig).pipe(Effect.provide(mockFS))
			);

			expect(patterns).toHaveLength(1);
			expect(patterns[0].id).toBe("pattern");
			expect(patterns[0].hasTypeScript).toBe(true);
		});
	});

	describe("validatePattern", () => {
		it("should validate a pattern with issues", async () => {
			const pattern = {
				id: "test",
				frontmatter: { title: "T" },
				hasTypeScript: false,
				rawPath: "raw/test.mdx"
			};

			const mockFS = Layer.succeed(FileSystem.FileSystem, {
				readFileString: () => Effect.succeed("## Good Example")
			} as any);

			const result = await Effect.runPromise(
				validatePattern(pattern as any, mockConfig).pipe(Effect.provide(mockFS))
			);

			expect(result.valid).toBe(false);
			expect(result.issues.length).toBeGreaterThan(0);
		});

		it("should handle file read failures comfortably", async () => {
			const pattern = { id: "test", rawPath: "fail.mdx", frontmatter: {} };
			const mockFS = Layer.succeed(FileSystem.FileSystem, {
				readFileString: () => Effect.fail(new Error("Read error"))
			} as any);

			const result = await Effect.runPromise(
				validatePattern(pattern as any, mockConfig).pipe(Effect.provide(mockFS))
			);

			expect(result.valid).toBe(false);
			expect(result.issues[0].message).toContain("Failed to read pattern file");
		});
	});

	describe("checkDuplicates", () => {
		it("should detect existing patterns", async () => {
			const results = [{ pattern: { id: "existing" } }];
			const mockFS = Layer.succeed(FileSystem.FileSystem, {
				readDirectory: () => Effect.succeed(["existing.mdx"])
			} as any);

			const checked = await Effect.runPromise(
				checkDuplicates(results as any, mockConfig).pipe(Effect.provide(mockFS))
			);

			expect(checked[0].isDuplicate).toBe(true);
		});
	});

	describe("generateReport", () => {
		it("should generate a correct report", () => {
			const results = [
				{ valid: true, testPassed: true, isDuplicate: false },
				{ valid: false, testPassed: false, isDuplicate: false }
			];
			const report = generateReport(results as any);
			expect(report.totalPatterns).toBe(2);
			expect(report.migrated).toBe(1);
			expect(report.failed).toBe(1);
		});
	});
});
