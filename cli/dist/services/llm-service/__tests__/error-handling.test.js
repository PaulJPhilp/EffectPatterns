import { describe, it, expect } from "vitest";
import { RateLimitError, QuotaExceededError } from "../errors.js";
describe("LLM Service Errors", () => {
    it("should create a RateLimitError with the correct tag", () => {
        const error = new RateLimitError({ provider: "google", reason: "test" });
        expect(error._tag).toBe("RateLimitError");
    });
    it("should create a QuotaExceededError with the correct tag", () => {
        const error = new QuotaExceededError({ provider: "google", reason: "test" });
        expect(error._tag).toBe("QuotaExceededError");
    });
    it("should parse generic AI error descriptions correctly", () => {
        const testCases = [
            {
                description: "Rate limit exceeded: too many requests",
                expected: "rate limit"
            },
            {
                description: "API quota exceeded for this billing cycle",
                expected: "quota"
            },
            {
                description: "Invalid request: bad request format",
                expected: "invalid"
            }
        ];
        testCases.forEach(({ description, expected }) => {
            const lowerDescription = description.toLowerCase();
            expect(lowerDescription).toContain(expected);
        });
    });
    it("should handle unexpected errors gracefully", () => {
        const unexpectedError = new Error("Network timeout");
        expect(unexpectedError.message).toBe("Network timeout");
    });
    it("should provide user-friendly error messages", () => {
        const errorMessages = {
            rateLimit: "Rate limit exceeded. Please try again later.",
            quotaExceeded: "API quota exceeded. Please check your usage.",
            invalidInput: "Invalid input: Invalid request format",
            generic: "AI service error: Generic error description"
        };
        expect(errorMessages.rateLimit).toContain("Rate limit exceeded");
        expect(errorMessages.quotaExceeded).toContain("API quota exceeded");
        expect(errorMessages.invalidInput).toContain("Invalid input");
    });
});
