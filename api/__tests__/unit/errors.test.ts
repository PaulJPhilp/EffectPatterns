/**
 * Unit tests for API error types
 */

import { describe, expect, it } from "vitest";
import { DatabaseError, RuleNotFoundError } from "../../errors";

describe("DatabaseError", () => {
    it("should create a DatabaseError with cause", () => {
        const cause = new Error("Connection failed");
        const error = new DatabaseError({ cause });

        expect(error._tag).toBe("DatabaseError");
        expect(error.cause).toBe(cause);
    });

    it("should be identifiable as DatabaseError", () => {
        const error = new DatabaseError({ cause: "test error" });

        expect(error._tag).toBe("DatabaseError");
        expect(error instanceof DatabaseError).toBe(true);
    });

    it("should preserve error type information", () => {
        const error = new DatabaseError({ cause: null });

        expect(typeof error._tag).toBe("string");
        expect(error._tag).toBe("DatabaseError");
    });
});

describe("RuleNotFoundError", () => {
    it("should create a RuleNotFoundError with id", () => {
        const id = "non-existent-rule";
        const error = new RuleNotFoundError({ id });

        expect(error._tag).toBe("RuleNotFoundError");
        expect(error.id).toBe(id);
    });

    it("should be identifiable as RuleNotFoundError", () => {
        const error = new RuleNotFoundError({ id: "test-id" });

        expect(error._tag).toBe("RuleNotFoundError");
        expect(error instanceof RuleNotFoundError).toBe(true);
    });

    it("should preserve the rule id", () => {
        const ruleId = "specific-rule-id";
        const error = new RuleNotFoundError({ id: ruleId });

        expect(error.id).toBe(ruleId);
    });
});

describe("Error Type Discrimination", () => {
    it("should allow discrimination by _tag", () => {
        const dbError = new DatabaseError({ cause: "db error" });
        const ruleError = new RuleNotFoundError({ id: "missing" });

        const errors = [dbError, ruleError];

        const databaseErrors = errors.filter((e) => e._tag === "DatabaseError");
        const ruleErrors = errors.filter((e) => e._tag === "RuleNotFoundError");

        expect(databaseErrors).toHaveLength(1);
        expect(ruleErrors).toHaveLength(1);
        expect(databaseErrors[0]).toBe(dbError);
        expect(ruleErrors[0]).toBe(ruleError);
    });
});
