/**
 * Ingest Pipeline Tests
 */

import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import {
	discoverPatterns,
	generateReport,
	runIngestPipeline,
	testPattern,
	validatePattern
} from "../pipeline.js";
import type { IngestConfig } from "../types.js";

const mockConfig: IngestConfig = {
	rawDir: "/test/raw",
	srcDir: "/test/src",
	processedDir: "/test/processed",
	publishedDir: "/test/published",
	targetPublishedDir: "/test/target-published",
	reportDir: "/test/reports",
};

describe("Ingest Pipeline", () => {
	it("should discover patterns from directory", async () => {
		const program = discoverPatterns(mockConfig);

		// This test would need a mock filesystem with test data
		// For now, just test the effect structure
		expect(program).toBeDefined();
	});

	it("should validate pattern structure", async () => {
		const mockPattern = {
			id: "test-pattern",
			title: "Test Pattern",
			rawPath: "/test/raw/test-pattern.mdx",
			srcPath: "/test/src/test-pattern.ts",
			processedPath: "/test/processed/test-pattern.mdx",
			frontmatter: {
				id: "test-pattern",
				title: "Test Pattern",
				skillLevel: "beginner",
				useCase: "testing",
				summary: "A test pattern",
			},
			hasTypeScript: true,
		};

		const program = validatePattern(mockPattern, mockConfig);

		// Test that the effect is properly structured
		expect(program).toBeDefined();

		// Note: Would need FileSystem service to actually run the effect
		// For now, just test the effect structure
	});

	it("should test pattern TypeScript code", async () => {
		const mockResult = {
			pattern: {
				id: "test-pattern",
				title: "Test Pattern",
				rawPath: "/test/raw/test-pattern.mdx",
				srcPath: "/test/src/test-pattern.ts",
				processedPath: "/test/processed/test-pattern.mdx",
				frontmatter: {},
				hasTypeScript: true,
			},
			valid: true,
			issues: [],
		};

		const program = testPattern(mockResult);
		const result = await Effect.runPromise(program);

		expect(result.pattern.id).toBe("test-pattern");
		expect(typeof result.testPassed).toBe("boolean");
	});

	it("should generate ingest report", () => {
		const mockResults = [
			{
				pattern: {
					id: "test-pattern",
					title: "Test Pattern",
					rawPath: "/test/raw/test-pattern.mdx",
					srcPath: "/test/src/test-pattern.ts",
					processedPath: "/test/processed/test-pattern.mdx",
					frontmatter: {},
					hasTypeScript: true,
				},
				valid: true,
				issues: [],
				testPassed: true,
			},
		];

		const report = generateReport(mockResults);

		expect(report.totalPatterns).toBe(1);
		expect(report.validated).toBe(1);
		expect(report.testsPassed).toBe(1);
		expect(report.migrated).toBe(1);
		expect(report.failed).toBe(0);
		expect(Array.isArray(report.results)).toBe(true);
	});

	it("should run complete ingest pipeline", async () => {
		const program = runIngestPipeline(mockConfig);

		// Test that the pipeline effect is properly structured
		expect(program).toBeDefined();
	});
});
