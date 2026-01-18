/**
 * Publish Service Helper tests
 */

import { describe, expect, it } from "vitest";
import {
    calculateLintStats,
    calculatePublishStats,
    calculateTestStats,
    countValidationIssues,
    createSafeFilename,
    extractPatternInfo,
    formatDuration,
    generatePatternLink,
    sortPatterns
} from "../helpers.js";

describe("Publish Helpers", () => {
	describe("Statistics Calculations", () => {
		it("should calculate test stats", () => {
			const results = [
				{ success: true, duration: 100 },
				{ success: false, duration: 200 },
				{ success: true, duration: 150, expectedError: true }
			];
			const stats = calculateTestStats(results as any);
			expect(stats.total).toBe(3);
			expect(stats.passed).toBe(2);
			expect(stats.failed).toBe(1);
			expect(stats.expectedErrors).toBe(1);
			expect(stats.totalDuration).toBe(450);
		});

		it("should calculate publish stats", () => {
			const results = [
				{ success: true, duration: 1000 },
				{ success: false, duration: 500 }
			];
			const stats = calculatePublishStats(results as any);
			expect(stats.total).toBe(2);
			expect(stats.published).toBe(1);
			expect(stats.totalDuration).toBe(1500);
		});

		it("should calculate lint stats", () => {
			const results = [
				{ success: true, issues: [], errors: 0, warnings: 0, duration: 50 },
				{ success: false, issues: [{}], errors: 1, warnings: 2, duration: 100 }
			];
			const stats = calculateLintStats(results as any);
			expect(stats.passed).toBe(1);
			expect(stats.totalIssues).toBe(1);
			expect(stats.totalErrors).toBe(1);
			expect(stats.totalWarnings).toBe(2);
		});

		it("should count validation issues", () => {
			const results = [
				{ issues: [{}, {}], errors: 1, warnings: 1 },
				{ issues: [{}], errors: 1, warnings: 0 }
			];
			const stats = countValidationIssues(results as any);
			expect(stats.total).toBe(3);
			expect(stats.errors).toBe(2);
			expect(stats.warnings).toBe(1);
		});
	});

	describe("Pattern Info Extraction", () => {
		it("should extract info from frontmatter", () => {
			const frontmatter = {
				id: "pattern-1",
				title: "Pattern One",
				skillLevel: "beginner",
				useCase: "testing"
			};
			const info = extractPatternInfo("test.mdx", frontmatter);
			expect(info.id).toBe("pattern-1");
			expect(info.title).toBe("Pattern One");
			expect(info.skillLevel).toBe("beginner");
		});

		it("should use filename as id if id is missing", () => {
			const info = extractPatternInfo("test-pattern.mdx", { title: "Test" });
			expect(info.id).toBe("test-pattern");
		});

		it("should throw on invalid path", () => {
			expect(() => extractPatternInfo("", {})).toThrow();
			expect(() => extractPatternInfo("../secret.mdx", {})).toThrow();
		});

		it("should throw if id is empty and path is empty", () => {
			expect(() => extractPatternInfo("", { id: "", title: "Test" })).toThrow();
		});
	});

	describe("Utilities", () => {
		it("should generate pattern link", () => {
			const pattern = {
				id: "test",
				title: "Test Pattern",
				skillLevel: "beginner",
				useCase: "testing"
			};
			const link = generatePatternLink(pattern as any);
			expect(link).toBe("- [Test Pattern](./test.mdx) - beginner - testing");
		});

		it("should handle array useCase in pattern link", () => {
			const pattern = {
				id: "test",
				title: "Test",
				skillLevel: "beginner",
				useCase: ["a", "b"]
			};
			const link = generatePatternLink(pattern as any);
			expect(link).toContain("a, b");
		});

		it("should sort patterns", () => {
			const patterns = [
				{ title: "B", skillLevel: "beginner" },
				{ title: "A", skillLevel: "beginner" },
				{ title: "C", skillLevel: "advanced" },
				{ title: "D", skillLevel: "unknown" }
			];
			const sorted = sortPatterns(patterns as any);
			expect(sorted[0].title).toBe("A");
			expect(sorted[1].title).toBe("B");
			expect(sorted[2].title).toBe("C");
			expect(sorted[3].title).toBe("D");
		});

		it("should create safe filename", () => {
			expect(createSafeFilename("Hello World!")).toBe("hello-world");
			expect(createSafeFilename("Multiple---Dashes")).toBe("multiple-dashes");
			expect(createSafeFilename("-Leading-Trailing-")).toBe("leading-trailing");
		});

		it("should format duration", () => {
			expect(formatDuration(500)).toBe("500ms");
			expect(formatDuration(1500)).toBe("1.5s");
			expect(formatDuration(120000)).toBe("2.0m");
			expect(formatDuration(7200000)).toBe("2.0h");
		});
	});
});
