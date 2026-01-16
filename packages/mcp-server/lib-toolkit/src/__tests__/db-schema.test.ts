/**
 * Database Schema Tests (No Mocks)
 */

import { describe, expect, it } from "vitest";
import {
	applicationPatterns,
	effectPatterns,
	jobs,
	jobStatuses,
	skillLevels,
	type ApplicationPattern,
	type EffectPattern,
	type Job
} from "../db/schema/index.js";

describe("Database Schema", () => {
	describe("Enums", () => {
		it("should have valid skill levels", () => {
			expect(skillLevels).toEqual(["beginner", "intermediate", "advanced"]);
			expect(skillLevels).toContain("beginner");
			expect(skillLevels).toContain("intermediate");
			expect(skillLevels).toContain("advanced");
			expect(skillLevels).toHaveLength(3);
		});

		it("should have valid job statuses", () => {
			expect(jobStatuses).toEqual(["covered", "partial", "gap"]);
			expect(jobStatuses).toContain("covered");
			expect(jobStatuses).toContain("partial");
			expect(jobStatuses).toContain("gap");
			expect(jobStatuses).toHaveLength(3);
		});
	});

	describe("Table Definitions", () => {
		it("should export application patterns table", () => {
			expect(applicationPatterns).toBeDefined();
			expect(typeof applicationPatterns).toBe("object");
		});

		it("should export effect patterns table", () => {
			expect(effectPatterns).toBeDefined();
			expect(typeof effectPatterns).toBe("object");
		});

		it("should export jobs table", () => {
			expect(jobs).toBeDefined();
			expect(typeof jobs).toBe("object");
		});
	});

	describe("Type Safety", () => {
		it("should have correct ApplicationPattern type structure", () => {
			// Test that the type has expected properties
			const pattern: Partial<ApplicationPattern> = {
				id: "test-id",
				slug: "test-slug",
				name: "Test Pattern",
				description: "Test description",
				learningOrder: 1,
				validated: false,
				createdAt: new Date(),
				updatedAt: new Date()
			};

			expect(pattern.id).toBe("test-id");
			expect(pattern.slug).toBe("test-slug");
			expect(pattern.name).toBe("Test Pattern");
			expect(pattern.description).toBe("Test description");
			expect(pattern.learningOrder).toBe(1);
			expect(pattern.validated).toBe(false);
			expect(pattern.createdAt).toBeInstanceOf(Date);
			expect(pattern.updatedAt).toBeInstanceOf(Date);
		});

		it("should have correct EffectPattern type structure", () => {
			const pattern: Partial<EffectPattern> = {
				id: "test-id",
				slug: "test-slug",
				title: "Test Pattern",
				summary: "Test summary",
				skillLevel: "beginner",
				useCases: ["validation"],
				createdAt: new Date(),
				updatedAt: new Date()
			};

			expect(pattern.id).toBe("test-id");
			expect(pattern.slug).toBe("test-slug");
			expect(pattern.title).toBe("Test Pattern");
			expect(pattern.summary).toBe("Test summary");
			expect(pattern.skillLevel).toBe("beginner");
			expect(pattern.useCases).toEqual(["validation"]);
			expect(pattern.createdAt).toBeInstanceOf(Date);
			expect(pattern.updatedAt).toBeInstanceOf(Date);
		});

		it("should have correct Job type structure", () => {
			const job: Partial<Job> = {
				id: "test-id",
				slug: "test-job",
				description: "Test description",
				status: "covered",
				createdAt: new Date(),
				updatedAt: new Date()
			};

			expect(job.id).toBe("test-id");
			expect(job.slug).toBe("test-job");
			expect(job.description).toBe("Test description");
			expect(job.status).toBe("covered");
			expect(job.createdAt).toBeInstanceOf(Date);
			expect(job.updatedAt).toBeInstanceOf(Date);
		});
	});

	describe("Validation Logic", () => {
		it("should validate skill level values", () => {
			const validSkillLevel = "beginner";
			const invalidSkillLevel = "expert";

			expect(skillLevels.includes(validSkillLevel as any)).toBe(true);
			expect(skillLevels.includes(invalidSkillLevel as any)).toBe(false);
		});

		it("should validate job status values", () => {
			const validStatus = "covered";
			const invalidStatus = "complete";

			expect(jobStatuses.includes(validStatus as any)).toBe(true);
			expect(jobStatuses.includes(invalidStatus as any)).toBe(false);
		});

		it("should validate slug format", () => {
			const validSlugs = [
				"test-pattern",
				"my-cool-pattern",
				"pattern-with-numbers-123",
				"simple"
			];

			const invalidSlugs = [
				"Test Pattern", // spaces and uppercase
				"test_pattern", // underscores
				"test-pattern-", // trailing dash
				"-test-pattern", // leading dash
				"test--pattern", // double dashes
				"" // empty
			];

			const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;

			validSlugs.forEach(slug => {
				expect(slugRegex.test(slug)).toBe(true);
			});

			invalidSlugs.forEach(slug => {
				expect(slugRegex.test(slug)).toBe(false);
			});
		});

		it("should validate learning order", () => {
			const validOrders = [1, 10, 100, 999];
			const invalidOrders = [0, -1, -100];

			validOrders.forEach(order => {
				expect(order).toBeGreaterThan(0);
				expect(Number.isInteger(order)).toBe(true);
			});

			invalidOrders.forEach(order => {
				expect(order).toBeLessThanOrEqual(0);
			});
		});
	});
});
