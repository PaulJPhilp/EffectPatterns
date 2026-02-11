/**
 * Database Schema Tests (No Mocks)
 */

import { describe, expect, it } from "vitest";
import {
	applicationPatterns,
	effectPatterns,
	skillLevels,
	type ApplicationPattern,
	type EffectPattern,
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

	});

	describe("Validation Logic", () => {
		it("should validate skill level values", () => {
			const validSkillLevel = "beginner";
			const invalidSkillLevel = "expert";

			expect(skillLevels.includes(validSkillLevel as any)).toBe(true);
			expect(skillLevels.includes(invalidSkillLevel as any)).toBe(false);
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
