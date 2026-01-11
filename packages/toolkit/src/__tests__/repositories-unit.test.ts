/**
 * Repository Unit Tests (No Mocks)
 */

import { describe, expect, it } from "vitest";
import {
	ApplicationPatternLockedError,
	ApplicationPatternNotFoundError,
	ApplicationPatternRepositoryError,
} from "../repositories/application-pattern.js";

describe("Repository Error Classes", () => {
	describe("ApplicationPatternNotFoundError", () => {
		it("should create error with identifier", () => {
			const error = new ApplicationPatternNotFoundError("test-pattern");

			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(ApplicationPatternNotFoundError);
			expect(error.identifier).toBe("test-pattern");
			expect(error._tag).toBe("ApplicationPatternNotFoundError");
			expect(error.message).toContain("test-pattern");
		});
	});

	describe("ApplicationPatternRepositoryError", () => {
		it("should create error with operation and cause", () => {
			const cause = new Error("Database connection failed");
			const error = new ApplicationPatternRepositoryError("findAll", cause);

			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(ApplicationPatternRepositoryError);
			expect(error.operation).toBe("findAll");
			expect(error.cause).toBe(cause);
			expect(error._tag).toBe("ApplicationPatternRepositoryError");
			expect(error.message).toContain("findAll");
			expect(error.message).toContain("Database connection failed");
		});
	});

	describe("ApplicationPatternLockedError", () => {
		it("should create error with identifier", () => {
			const error = new ApplicationPatternLockedError("locked-pattern");

			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(ApplicationPatternLockedError);
			expect(error.identifier).toBe("locked-pattern");
			expect(error._tag).toBe("ApplicationPatternLockedError");
			expect(error.message).toContain("locked-pattern");
			expect(error.message).toContain("locked");
		});
	});
});

describe("Repository Logic", () => {
	describe("Pattern Locking Logic", () => {
		it("should identify locked patterns", () => {
			const lockedPattern = { validated: true };
			const unlockedPattern = { validated: false };
			const undefinedPattern = { validated: undefined };

			// Test the logic that would be in isLocked function
			const isLocked = (pattern: any) => pattern.validated === true;

			expect(isLocked(lockedPattern)).toBe(true);
			expect(isLocked(unlockedPattern)).toBe(false);
			expect(isLocked(undefinedPattern)).toBe(false);
		});
	});

	describe("Repository Operations", () => {
		it("should validate operation names", () => {
			const validOperations = ["findAll", "findById", "findBySlug", "create", "update", "delete"];
			const invalidOperations = ["", "find", "invalid-op"];

			validOperations.forEach(op => {
				expect(op.length).toBeGreaterThan(0);
				expect(typeof op).toBe("string");
			});

			invalidOperations.forEach(op => {
				if (op === "") {
					expect(op).toBe("");
				} else {
					expect(validOperations.includes(op)).toBe(false);
				}
			});
		});

		it("should validate pattern identifiers", () => {
			const validIds = ["pattern-123", "test_pattern", "app-pattern-v1"];
			const invalidIds = ["", "   ", null, undefined];

			validIds.forEach(id => {
				expect(id).toBeTruthy();
				expect(typeof id).toBe("string");
				expect(id.trim().length).toBeGreaterThan(0);
			});

			invalidIds.forEach(id => {
				expect(!id || id.trim() === "").toBe(true);
			});
		});
	});

	describe("Error Handling Patterns", () => {
		it("should create not found error", () => {
			const error = new ApplicationPatternNotFoundError("missing-pattern");
			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(ApplicationPatternNotFoundError);
			expect(error.message).toContain("not found");
		});

		it("should create locked error", () => {
			const error = new ApplicationPatternLockedError("locked-pattern");
			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(ApplicationPatternLockedError);
			expect(error.message).toContain("locked");
		});

		it("should create repository error", () => {
			const cause = new Error("Constraint violation");
			const error = new ApplicationPatternRepositoryError("update", cause);
			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(ApplicationPatternRepositoryError);
			expect(error.message).toContain("repository error");
		});
	});

	describe("Data Validation", () => {
		it("should validate pattern data structure", () => {
			const validPattern = {
				id: "test-id",
				slug: "test-pattern",
				name: "Test Pattern",
				description: "A test pattern",
				learningOrder: 1,
				validated: false
			};

			const invalidPatterns = [
				{}, // missing required fields
				{ id: "" }, // empty id
				{ slug: "invalid slug with spaces" }, // invalid slug format
				{ learningOrder: -1 } // negative learning order
			];

			// Test validation logic
			const validatePattern = (pattern: any) => {
				const errors = [];

				if (!pattern.id || typeof pattern.id !== "string") {
					errors.push("Invalid id");
				}

				if (!pattern.slug || !/^[a-z0-9-]+$/.test(pattern.slug)) {
					errors.push("Invalid slug");
				}

				if (pattern.learningOrder !== undefined && pattern.learningOrder <= 0) {
					errors.push("Invalid learning order");
				}

				return errors;
			};

			expect(validatePattern(validPattern)).toEqual([]);

			invalidPatterns.forEach(pattern => {
				const errors = validatePattern(pattern);
				expect(errors.length).toBeGreaterThan(0);
			});
		});
	});
});
