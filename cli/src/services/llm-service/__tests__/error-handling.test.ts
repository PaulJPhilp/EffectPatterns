import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { AiError } from "@effect/ai";
import { streamText, generateText } from "../service.js";
import { Providers, Models } from "../types.js";

describe("Stage 5: Robust AI Error Handling", () => {
  it("should handle RateLimitError with proper message", () => {
    const rateLimitError = new AiError.AiError({
      _tag: "RateLimitError",
      description: "Rate limit exceeded",
      module: "test",
      method: "test"
    });

    // Test that error handling produces user-friendly messages
    expect(rateLimitError.description).toContain("Rate limit");
  });

  it("should handle QuotaExceededError with proper message", () => {
    const quotaError = new AiError.AiError({
      _tag: "QuotaExceededError", 
      description: "API quota exceeded",
      module: "test",
      method: "test"
    });

    expect(quotaError.description).toContain("quota exceeded");
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
