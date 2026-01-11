/**
 * Publish Service Helpers Tests
 */

import { describe, expect, it } from "vitest";
import {
	calculateLintStats,
	calculatePublishStats,
	calculateTestStats,
	countValidationIssues,
	executeCommand,
	extractPatternInfo,
	fileExists,
	generatePatternLink,
	getFailedPublishes,
	getFailedTests,
	getFailedValidations,
	getFilesWithIssues,
	getMdxFiles,
	getSlowestTests,
	getTsFiles,
	groupLintIssuesByRule,
	groupValidationIssuesByCategory,
	readFileContent,
	runTypeScriptCheck,
	runTypeScriptFile,
	sortPatterns,
	writeFileContent,
} from "../helpers.js";
import type {
	LintResult,
	PatternInfo,
	PublishResult,
	TestResult,
	ValidationResult
} from "../types.js";

describe("Publish Service Helpers", () => {
	describe("File System Helpers", () => {
		it("should create file exists effect", () => {
			const program = fileExists("/test/file.txt");

			expect(program).toBeDefined();
			expect(typeof program.pipe).toBe('function');
		});

		it("should create read file content effect", () => {
			const program = readFileContent("/test/file.txt");

			expect(program).toBeDefined();
			expect(typeof program.pipe).toBe('function');
		});

		it("should create write file content effect", () => {
			const program = writeFileContent("/test/file.txt", "content");

			expect(program).toBeDefined();
			expect(typeof program.pipe).toBe('function');
		});

		it("should create get MDX files effect", () => {
			const program = getMdxFiles("/test/dir");

			expect(program).toBeDefined();
			expect(typeof program.pipe).toBe('function');
		});

		it("should create get TypeScript files effect", () => {
			const program = getTsFiles("/test/dir");

			expect(program).toBeDefined();
			expect(typeof program.pipe).toBe('function');
		});
	});

	describe("Execution Helpers", () => {
		it("should create execute command effect", () => {
			const program = executeCommand("echo test", 5000);

			expect(program).toBeDefined();
			expect(typeof program.pipe).toBe('function');
		});

		it("should create TypeScript check effect", () => {
			const program = runTypeScriptCheck("/test/file.ts");

			expect(program).toBeDefined();
			expect(typeof program.pipe).toBe('function');
		});

		it("should create run TypeScript file effect", () => {
			const program = runTypeScriptFile("/test/file.ts", 10000);

			expect(program).toBeDefined();
			expect(typeof program.pipe).toBe('function');
		});
	});

	describe("Validation Statistics", () => {
		it("should count validation issues", () => {
			const results: ValidationResult[] = [
				{ file: "1.mdx", valid: true, issues: [], warnings: 0, errors: 0 },
				{ file: "2.mdx", valid: false, issues: [{ type: "error", category: "frontmatter", message: "Missing id" }], warnings: 0, errors: 1 },
				{ file: "3.mdx", valid: false, issues: [{ type: "warning", category: "content", message: "Unclear" }, { type: "error", category: "structure", message: "Missing section" }], warnings: 1, errors: 1 },
			];

			const counts = countValidationIssues(results);

			expect(counts).toEqual({
				total: 3,
				errors: 2,
				warnings: 1,
			});
		});

		it("should handle empty validation results", () => {
			const counts = countValidationIssues([]);

			expect(counts).toEqual({
				total: 0,
				errors: 0,
				warnings: 0,
			});
		});

		it("should group validation issues by category", () => {
			const results: ValidationResult[] = [
				{ file: "1.mdx", valid: false, issues: [{ type: "error", category: "frontmatter", message: "Missing id" }], warnings: 1, errors: 0 },
				{ file: "2.mdx", valid: false, issues: [{ type: "error", category: "frontmatter", message: "Missing title" }], warnings: 0, errors: 1 },
				{ file: "3.mdx", valid: false, issues: [{ type: "warning", category: "content", message: "Unclear" }], warnings: 1, errors: 0 },
			];

			const grouped = groupValidationIssuesByCategory(results);

			expect(Object.keys(grouped)).toContain("frontmatter");
			expect(Object.keys(grouped)).toContain("content");
			expect(grouped.frontmatter).toHaveLength(2);
			expect(grouped.content).toHaveLength(1);
		});

		it("should get failed validations", () => {
			const results: ValidationResult[] = [
				{ file: "1.mdx", valid: true, issues: [], warnings: 0, errors: 0 },
				{ file: "2.mdx", valid: false, issues: [], warnings: 0, errors: 1 },
				{ file: "3.mdx", valid: false, issues: [], warnings: 1, errors: 0 },
			];

			const failed = getFailedValidations(results);

			expect(failed).toHaveLength(2);
			expect(failed.map(r => r.file)).toEqual(["2.mdx", "3.mdx"]);
		});
	});

	describe("Test Statistics", () => {
		it("should calculate test statistics", () => {
			const results: TestResult[] = [
				{ file: "1.ts", success: true, duration: 100 },
				{ file: "2.ts", success: false, duration: 200 },
				{ file: "3.ts", success: true, duration: 150 },
				{ file: "4.ts", success: false, expectedError: true, duration: 50 },
			];

			const stats = calculateTestStats(results);

			expect(stats).toEqual({
				total: 4,
				passed: 2,
				failed: 2,
				expectedErrors: 1,
				totalDuration: 500,
				avgDuration: 125,
				minDuration: 50,
				maxDuration: 200,
			});
		});

		it("should handle empty test results", () => {
			const stats = calculateTestStats([]);

			expect(stats).toEqual({
				total: 0,
				passed: 0,
				failed: 0,
				expectedErrors: 0,
				totalDuration: 0,
				avgDuration: 0,
				minDuration: 0,
				maxDuration: 0,
			});
		});

		it("should get failed tests", () => {
			const results: TestResult[] = [
				{ file: "1.ts", success: true, duration: 100 },
				{ file: "2.ts", success: false, duration: 200 },
				{ file: "3.ts", success: false, expectedError: true, duration: 50 },
				{ file: "4.ts", success: true, duration: 150 },
			];

			const failed = getFailedTests(results);

			expect(failed).toHaveLength(1);
			expect(failed[0].file).toBe("2.ts");
		});

		it("should get slowest tests", () => {
			const results: TestResult[] = [
				{ file: "1.ts", success: true, duration: 100 },
				{ file: "2.ts", success: false, duration: 200 },
				{ file: "3.ts", success: true, duration: 150 },
				{ file: "4.ts", success: true, duration: 50 },
			];

			const slowest = getSlowestTests(results, 3);

			expect(slowest).toHaveLength(3);
			expect(slowest.map(r => r.file)).toEqual(["2.ts", "3.ts", "1.ts"]);
		});
	});

	describe("Publish Statistics", () => {
		it("should calculate publish statistics", () => {
			const results: PublishResult[] = [
				{ file: "1.mdx", success: true, duration: 100 },
				{ file: "2.mdx", success: false, duration: 200 },
				{ file: "3.mdx", success: true, duration: 150 },
			];

			const stats = calculatePublishStats(results);

			expect(stats).toEqual({
				total: 3,
				published: 2,
				failed: 1,
				totalDuration: 450,
				avgDuration: 150,
			});
		});

		it("should handle empty publish results", () => {
			const stats = calculatePublishStats([]);

			expect(stats).toEqual({
				total: 0,
				published: 0,
				failed: 0,
				totalDuration: 0,
				avgDuration: 0,
			});
		});

		it("should get failed publishes", () => {
			const results: PublishResult[] = [
				{ file: "1.mdx", success: true, duration: 100 },
				{ file: "2.mdx", success: false, duration: 200 },
				{ file: "3.mdx", success: true, duration: 150 },
			];

			const failed = getFailedPublishes(results);

			expect(failed).toHaveLength(1);
			expect(failed[0].file).toBe("2.mdx");
		});
	});

	describe("Lint Statistics", () => {
		it("should calculate lint statistics", () => {
			const results: LintResult[] = [
				{ file: "1.ts", success: true, issues: [], warnings: 0, errors: 0, duration: 100 },
				{ file: "2.ts", success: false, issues: [{ rule: "no-console", severity: "error", message: "Console found" }], warnings: 0, errors: 1, duration: 200 },
				{ file: "3.ts", success: false, issues: [{ rule: "prefer-const", severity: "warning", message: "Use const" }], warnings: 1, errors: 0, duration: 150 },
			];

			const stats = calculateLintStats(results);

			expect(stats).toEqual({
				total: 3,
				passed: 1,
				failed: 2,
				totalIssues: 2,
				totalErrors: 1,
				totalWarnings: 1,
				totalDuration: 450,
			});
		});

		it("should handle empty lint results", () => {
			const stats = calculateLintStats([]);

			expect(stats).toEqual({
				total: 0,
				passed: 0,
				failed: 0,
				totalIssues: 0,
				totalErrors: 0,
				totalWarnings: 0,
				totalDuration: 0,
			});
		});

		it("should get files with issues", () => {
			const results: LintResult[] = [
				{ file: "1.ts", success: true, issues: [], warnings: 0, errors: 0, duration: 100 },
				{ file: "2.ts", success: false, issues: [{ rule: "no-console", severity: "error", message: "Console found" }], warnings: 0, errors: 1, duration: 200 },
				{ file: "3.ts", success: false, issues: [], warnings: 0, errors: 0, duration: 150 },
			];

			const filesWithIssues = getFilesWithIssues(results);

			expect(filesWithIssues).toHaveLength(1);
			expect(filesWithIssues[0].file).toBe("2.ts");
		});

		it("should group lint issues by rule", () => {
			const results: LintResult[] = [
				{ file: "1.ts", success: false, issues: [{ rule: "no-console", severity: "error", message: "Console found" }], warnings: 0, errors: 1, duration: 100 },
				{ file: "2.ts", success: false, issues: [{ rule: "no-console", severity: "error", message: "Another console" }], warnings: 0, errors: 1, duration: 200 },
				{ file: "3.ts", success: false, issues: [{ rule: "prefer-const", severity: "warning", message: "Use const" }], warnings: 1, errors: 0, duration: 150 },
			];

			const grouped = groupLintIssuesByRule(results);

			expect(Object.keys(grouped)).toContain("no-console");
			expect(Object.keys(grouped)).toContain("prefer-const");
			expect(grouped["no-console"]).toHaveLength(2);
			expect(grouped["prefer-const"]).toHaveLength(1);
		});
	});

	describe("Generation Helpers", () => {
		it("should extract pattern info", () => {
			const filePath = "/test/pattern.mdx";
			const frontmatter = {
				id: "test-pattern",
				title: "Test Pattern",
				skillLevel: "beginner",
				useCase: "testing",
				tags: ["react", "hooks"],
			};

			const info = extractPatternInfo(filePath, frontmatter);

			expect(info).toEqual({
				id: "test-pattern",
				title: "Test Pattern",
				skillLevel: "beginner",
				useCase: "testing",
				tags: ["react", "hooks"],
				filePath,
			});
		});

		it("should handle missing frontmatter fields", () => {
			const filePath = "/test/pattern.mdx";
			const frontmatter = {};

			const info = extractPatternInfo(filePath, frontmatter);

			expect(info).toEqual({
				id: "/test/pattern",
				title: "Unknown",
				skillLevel: "unknown",
				useCase: "unknown",
				tags: [],
				filePath,
			});
		});

		it("should generate pattern link", () => {
			const pattern: PatternInfo = {
				id: "test-pattern",
				title: "Test Pattern",
				skillLevel: "beginner",
				useCase: "testing",
				tags: ["react", "hooks"],
				filePath: "/test/pattern.mdx",
			};

			const link = generatePatternLink(pattern);

			expect(link).toBe("- [Test Pattern](./test-pattern.mdx) - beginner - testing");
		});

		it("should handle array use case in pattern link", () => {
			const pattern: PatternInfo = {
				id: "test-pattern",
				title: "Test Pattern",
				skillLevel: "beginner",
				useCase: ["testing", "learning"],
				tags: ["react"],
				filePath: "/test/pattern.mdx",
			};

			const link = generatePatternLink(pattern);

			expect(link).toBe("- [Test Pattern](./test-pattern.mdx) - beginner - testing, learning");
		});

		it("should sort patterns by skill level and title", () => {
			const patterns: PatternInfo[] = [
				{ id: "1", title: "Advanced Pattern", skillLevel: "advanced", useCase: "test", tags: [], filePath: "" },
				{ id: "2", title: "Beginner Pattern", skillLevel: "beginner", useCase: "test", tags: [], filePath: "" },
				{ id: "3", title: "Intermediate Pattern", skillLevel: "intermediate", useCase: "test", tags: [], filePath: "" },
				{ id: "4", title: "Another Beginner Pattern", skillLevel: "beginner", useCase: "test", tags: [], filePath: "" },
				{ id: "5", title: "Unknown Pattern", skillLevel: "unknown", useCase: "test", tags: [], filePath: "" },
			];

			const sorted = sortPatterns(patterns);

			expect(sorted.map(p => p.id)).toEqual(["4", "2", "3", "1", "5"]);
		});

		it("should handle unknown skill levels in sorting", () => {
			const patterns: PatternInfo[] = [
				{ id: "1", title: "Unknown Pattern", skillLevel: "unknown", useCase: "test", tags: [], filePath: "" },
				{ id: "2", title: "Beginner Pattern", skillLevel: "beginner", useCase: "test", tags: [], filePath: "" },
			];

			const sorted = sortPatterns(patterns);

			expect(sorted.map(p => p.id)).toEqual(["2", "1"]);
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty arrays in statistics", () => {
			expect(calculateTestStats([]).total).toBe(0);
			expect(calculatePublishStats([]).total).toBe(0);
			expect(calculateLintStats([]).total).toBe(0);
			expect(countValidationIssues([]).total).toBe(0);
		});

		it("should handle single item arrays", () => {
			const testResult: TestResult = { file: "test.ts", success: true, duration: 100 };
			const testStats = calculateTestStats([testResult]);

			expect(testStats.total).toBe(1);
			expect(testStats.passed).toBe(1);
			expect(testStats.failed).toBe(0);
		});

		it("should handle zero durations", () => {
			const results: TestResult[] = [
				{ file: "1.ts", success: true, duration: 0 },
				{ file: "2.ts", success: true, duration: 0 },
			];

			const stats = calculateTestStats(results);

			expect(stats.totalDuration).toBe(0);
			expect(stats.avgDuration).toBe(0);
			expect(stats.minDuration).toBe(0);
			expect(stats.maxDuration).toBe(0);
		});
	});
});
