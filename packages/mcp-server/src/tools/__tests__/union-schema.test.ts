/**
 * Unit tests for the discriminated union schema that validates all structured content types.
 * 
 * This ensures that any tool's structuredContent field can be validated against
 * a single union schema, preventing drift as new response types are added.
 */

import { describe, it, expect } from "vitest";
import {
  ToolStructuredContentSchema,
  SearchResultsOutputSchema,
  PatternDetailsOutputSchema,
  ElicitationSchema,
  ToolErrorSchema,
} from "../../schemas/output-schemas.js";

describe("ToolStructuredContentSchema (Discriminated Union)", () => {
  it("should validate search results output", () => {
    const valid: unknown = {
      kind: "patternSearchResults:v1",
      query: { q: "error" },
      metadata: {
        totalCount: 5,
        renderedCards: 10,
        renderedCardIds: ["a"],
        contractMarkers: { index: 1, cards: 1, version: "v1" },
      },
      patterns: [
        {
          id: "a",
          title: "Test",
          category: "error-handling",
          difficulty: "beginner",
          description: "Test pattern",
        },
      ],
    };

    const result = ToolStructuredContentSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kind).toBe("patternSearchResults:v1");
    }
  });

  it("should validate pattern details output", () => {
    const valid: unknown = {
      kind: "patternDetails:v1",
      id: "test-pattern",
      title: "Test Pattern",
      category: "error-handling",
      difficulty: "beginner",
      summary: "Brief summary",
      description: "Full description",
    };

    const result = ToolStructuredContentSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kind).toBe("patternDetails:v1");
    }
  });

  it("should validate elicitation output", () => {
    const valid: unknown = {
      kind: "needsInput:v1",
      type: "elicitation",
      message: "Please provide a search query",
      needsInput: {
        fields: ["q"],
        reason: "Search query is required",
        suggestions: { q: ["error", "retry"] },
      },
    };

    const result = ToolStructuredContentSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kind).toBe("needsInput:v1");
    }
  });

  it("should validate tool error output", () => {
    const valid: unknown = {
      kind: "toolError:v1",
      code: "NETWORK_ERROR",
      message: "Network timeout",
      retryable: true,
    };

    const result = ToolStructuredContentSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kind).toBe("toolError:v1");
    }
  });

  it("should reject invalid kind discriminator", () => {
    const invalid: unknown = {
      kind: "invalidKind:v1",
      message: "This should fail",
    };

    const result = ToolStructuredContentSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("should reject missing kind discriminator", () => {
    const invalid: unknown = {
      message: "Missing kind",
    };

    const result = ToolStructuredContentSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("should validate that all individual schemas are compatible with union", () => {
    // Verify that each individual schema validates against the union
    const searchResults = {
      kind: "patternSearchResults:v1" as const,
      query: { q: "test" },
      metadata: {
        totalCount: 1,
        renderedCards: 1,
        renderedCardIds: ["test"],
        contractMarkers: { index: 0, cards: 1, version: "v1" },
      },
      patterns: [],
    };

    const patternDetails = {
      kind: "patternDetails:v1" as const,
      id: "test",
      title: "Test",
      category: "test",
      difficulty: "beginner" as const,
      summary: "Test",
      description: "Test",
    };

    const elicitation = {
      kind: "needsInput:v1" as const,
      type: "elicitation" as const,
      message: "Test",
      needsInput: {
        fields: ["q"],
        reason: "Test",
      },
    };

    const toolError = {
      kind: "toolError:v1" as const,
      code: "TEST_ERROR",
      message: "Test",
    };

    expect(ToolStructuredContentSchema.safeParse(searchResults).success).toBe(true);
    expect(ToolStructuredContentSchema.safeParse(patternDetails).success).toBe(true);
    expect(ToolStructuredContentSchema.safeParse(elicitation).success).toBe(true);
    expect(ToolStructuredContentSchema.safeParse(toolError).success).toBe(true);
  });
});
