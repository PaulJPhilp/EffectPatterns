/**
 * QA Service Helpers Tests
 */

import { describe, expect, it } from "vitest";
import {
	ERROR_CATEGORIES,
	QA_FILE_SUFFIX,
	calculatePassRate,
	categorizeError,
	countFailuresByCategory,
	createPatternBackup,
	extractFailedPatternIds,
	filterFailedPatterns,
	generateRecommendations,
	groupBySkillLevel,
	groupByTags,
	loadQAResults,
	patternExists,
} from "../helpers.js";
import type { QAConfig, QAResult } from "../types.js";

describe("QA Service Helpers", () => {
	describe("Constants", () => {
		it("should have error categories defined", () => {
			expect(ERROR_CATEGORIES).toEqual({
				IMPORTS: "imports",
				TYPESCRIPT: "typescript",
				DEPRECATED: "deprecated",
				EXAMPLES: "examples",
				DOCUMENTATION: "documentation",
				METADATA: "metadata",
				PATTERNS: "patterns",
				OTHER: "other",
			});
		});

		it("should have QA file suffix", () => {
			expect(QA_FILE_SUFFIX).toBe("-qa.json");
		});
	});

	describe("Error Categorization", () => {
		it("should categorize import errors", () => {
			expect(categorizeError("import error")).toBe("imports");
			expect(categorizeError("export not found")).toBe("imports");
		});

		it("should categorize TypeScript errors", () => {
			expect(categorizeError("TypeScript error")).toBe("typescript");
			expect(categorizeError("type error")).toBe("typescript");
		});

		it("should categorize deprecated errors", () => {
			expect(categorizeError("deprecated API")).toBe("deprecated");
			expect(categorizeError("outdated method")).toBe("deprecated");
		});

		it("should categorize example errors", () => {
			expect(categorizeError("example not working")).toBe("examples");
			expect(categorizeError("demo failed")).toBe("examples");
		});

		it("should categorize documentation errors", () => {
			expect(categorizeError("documentation unclear")).toBe("documentation");
			expect(categorizeError("clarity issue")).toBe("documentation");
		});

		it("should categorize metadata errors", () => {
			expect(categorizeError("metadata missing")).toBe("metadata");
			expect(categorizeError("frontmatter error")).toBe("metadata");
		});

		it("should categorize pattern errors", () => {
			expect(categorizeError("pattern violation")).toBe("patterns");
			expect(categorizeError("best practice")).toBe("patterns");
		});

		it("should categorize other errors", () => {
			expect(categorizeError("unknown error")).toBe("other");
			expect(categorizeError("random issue")).toBe("other");
		});
	});

	describe("Statistics Calculations", () => {
		it("should calculate pass rate", () => {
			const results: QAResult[] = [
				{ passed: true, patternId: "1" },
				{ passed: false, patternId: "2" },
				{ passed: true, patternId: "3" },
			];

			const rate = calculatePassRate(results);

			expect(rate).toBe(66.66666666666666);
		});

		it("should handle empty results", () => {
			const rate = calculatePassRate([]);
			expect(rate).toBe(0);
		});

		it("should handle all passed", () => {
			const results: QAResult[] = [
				{ passed: true, patternId: "1" },
				{ passed: true, patternId: "2" },
			];

			const rate = calculatePassRate(results);
			expect(rate).toBe(100);
		});

		it("should handle all failed", () => {
			const results: QAResult[] = [
				{ passed: false, patternId: "1" },
				{ passed: false, patternId: "2" },
			];

			const rate = calculatePassRate(results);
			expect(rate).toBe(0);
		});

		it("should group by skill level", () => {
			const results: QAResult[] = [
				{ passed: true, metadata: { skillLevel: "beginner" } },
				{ passed: false, metadata: { skillLevel: "beginner" } },
				{ passed: true, metadata: { skillLevel: "advanced" } },
				{ passed: false, metadata: { skillLevel: "intermediate" } },
			];

			const grouped = groupBySkillLevel(results);

			expect(grouped).toEqual({
				beginner: { passed: 1, failed: 1 },
				advanced: { passed: 1, failed: 0 },
				intermediate: { passed: 0, failed: 1 },
			});
		});

		it("should group by tags", () => {
			const results: QAResult[] = [
				{ passed: true, metadata: { tags: ["react", "hooks"] } },
				{ passed: false, metadata: { tags: ["react"] } },
				{ passed: true, metadata: { tags: ["hooks"] } },
				{ passed: false, metadata: { tags: ["typescript"] } },
			];

			const grouped = groupByTags(results);

			expect(grouped).toEqual({
				react: { passed: 1, failed: 1 },
				hooks: { passed: 2, failed: 0 },
				typescript: { passed: 0, failed: 1 },
			});
		});

		it("should count failures by category", () => {
			const results: QAResult[] = [
				{ passed: false, errors: ["import error", "type error"] },
				{ passed: false, errors: ["import error"] },
				{ passed: true, errors: [] },
				{ passed: false, errors: ["deprecated API"] },
			];

			const counts = countFailuresByCategory(results);

			expect(counts).toEqual({
				imports: 2,
				typescript: 1,
				deprecated: 1,
			});
		});

		it("should handle empty errors in count failures", () => {
			const results: QAResult[] = [
				{ passed: true, errors: [] },
				{ passed: false, errors: [] },
			];

			const counts = countFailuresByCategory(results);

			expect(counts).toEqual({});
		});
	});

	describe("Recommendation Generation", () => {
		it("should generate recommendations for failed patterns", () => {
			const results: QAResult[] = [
				{ passed: false, errors: ["import error"] },
				{ passed: true },
				{ passed: false, errors: ["type error"] },
			];

			const recommendations = generateRecommendations(results);

			expect(recommendations).toContain("Found 2 failed patterns. Run \"ep-admin qa repair\" to fix them.");
		});

		it("should generate no recommendations for all passed", () => {
			const results: QAResult[] = [
				{ passed: true },
				{ passed: true },
			];

			const recommendations = generateRecommendations(results);

			expect(recommendations).toHaveLength(0);
		});

		it("should generate low pass rate recommendations", () => {
			const results: QAResult[] = [
				{ passed: false },
				{ passed: false },
				{ passed: false },
				{ passed: true },
			];

			const recommendations = generateRecommendations(results);

			expect(recommendations).toContain("Overall pass rate is 25.0%. Consider reviewing patterns with common issues.");
		});

		it("should generate high pass rate recommendations", () => {
			const results: QAResult[] = [
				{ passed: true },
				{ passed: true },
				{ passed: true },
				{ passed: false },
			];

			const recommendations = generateRecommendations(results);

			// 75% pass rate is exactly at the threshold, so it should generate recommendations
			expect(recommendations.length).toBeGreaterThan(0);
		});

		it("should generate recommendations for pass rate at threshold", () => {
			const results: QAResult[] = [
				{ passed: true },
				{ passed: true },
				{ passed: true },
				{ passed: false },
			];

			const recommendations = generateRecommendations(results);

			// 75% pass rate is exactly at the threshold, so it should generate recommendations
			expect(recommendations.length).toBeGreaterThan(0);
		});
	});

	describe("Result Filtering", () => {
		it("should filter failed patterns", () => {
			const results: QAResult[] = [
				{ passed: true, patternId: "1" },
				{ passed: false, patternId: "2" },
				{ passed: false, patternId: "3" },
			];

			const failed = filterFailedPatterns(results);

			expect(failed).toHaveLength(2);
			expect(failed.map(r => r.patternId)).toEqual(["2", "3"]);
		});

		it("should handle no failed patterns", () => {
			const results: QAResult[] = [
				{ passed: true, patternId: "1" },
				{ passed: true, patternId: "2" },
			];

			const failed = filterFailedPatterns(results);

			expect(failed).toHaveLength(0);
		});

		it("should handle all failed patterns", () => {
			const results: QAResult[] = [
				{ passed: false, patternId: "1" },
				{ passed: false, patternId: "2" },
			];

			const failed = filterFailedPatterns(results);

			expect(failed).toHaveLength(2);
		});

		it("should extract failed pattern IDs", () => {
			const results: QAResult[] = [
				{ passed: true, patternId: "1" },
				{ passed: false, patternId: "2" },
				{ passed: false, patternId: "3" },
			];

			const ids = extractFailedPatternIds(results);

			expect(ids).toEqual(["2", "3"]);
		});

		it("should handle empty results for ID extraction", () => {
			const ids = extractFailedPatternIds([]);
			expect(ids).toEqual([]);
		});
	});

	describe("Effect Structure Tests", () => {
		it("should create load QA results effect", () => {
			const config = { resultsDir: "/test" } as QAConfig;
			const program = loadQAResults(config);

			expect(program).toBeDefined();
			expect(typeof program.pipe).toBe('function');
		});

		it("should create pattern exists effect", () => {
			const config = { patternsDir: "/test" } as QAConfig;
			const program = patternExists("test", config);

			expect(program).toBeDefined();
			expect(typeof program.pipe).toBe('function');
		});

		it("should create pattern backup effect", () => {
			const config = { backupsDir: "/test" } as QAConfig;
			const program = createPatternBackup("test", config);

			expect(program).toBeDefined();
			expect(typeof program.pipe).toBe('function');
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty string in categorization", () => {
			expect(categorizeError("")).toBe("other");
		});

		it("should handle grouping with missing metadata", () => {
			const results: QAResult[] = [
				{ passed: true, metadata: {} },
				{ passed: false, metadata: {} },
			];

			const skillGrouped = groupBySkillLevel(results);
			const tagGrouped = groupByTags(results);

			expect(skillGrouped).toEqual({
				unknown: { passed: 1, failed: 1 }
			});
			expect(tagGrouped).toEqual({});
		});

		it("should handle results without errors", () => {
			const results: QAResult[] = [
				{ passed: true },
				{ passed: false },
			];

			const counts = countFailuresByCategory(results);
			expect(counts).toEqual({});
		});
	});
});
