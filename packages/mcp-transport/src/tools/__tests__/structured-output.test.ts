import { describe, it, expect } from "vitest";
import {
  SearchResultsOutputSchema,
  PatternDetailsOutputSchema,
  ElicitationSchema,
} from "../../schemas/output-schemas.js";

describe("Structured Output Schemas", () => {
  describe("SearchResultsOutputSchema", () => {
    it("should validate valid search results output", () => {
      const validOutput = {
        kind: "patternSearchResults:v1",
        query: {
          q: "error",
          category: "error-handling",
          difficulty: "beginner",
          limit: 10,
        },
        metadata: {
          totalCount: 5,
          categories: { "error-handling": 5 },
          difficulties: { beginner: 5 },
          renderedCards: 10,
          renderedCardIds: ["pattern-1"],
          contractMarkers: {
            index: 1,
            cards: 1,
            version: "v1",
          },
        },
        patterns: [
          {
            id: "pattern-1",
            title: "Pattern 1",
            category: "error-handling",
            difficulty: "beginner",
            description: "Test pattern",
            tags: ["error"],
          },
        ],
      };

      const result = SearchResultsOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it("should validate with optional fields", () => {
      const minimalOutput = {
        kind: "patternSearchResults:v1",
        query: {},
        metadata: {
          totalCount: 0,
          renderedCards: 0,
          renderedCardIds: [],
          contractMarkers: {
            index: 0,
            cards: 0,
            version: "v1",
          },
        },
        patterns: [],
      };

      const result = SearchResultsOutputSchema.safeParse(minimalOutput);
      expect(result.success).toBe(true);
    });

    it("should reject invalid structure", () => {
      const invalidOutput = {
        query: {},
        // Missing metadata
        patterns: [],
      };

      const result = SearchResultsOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });
  });

  describe("PatternDetailsOutputSchema", () => {
    it("should validate valid pattern details output", () => {
      const validOutput = {
        kind: "patternDetails:v1",
        id: "pattern-1",
        title: "Pattern 1",
        category: "error-handling",
        difficulty: "beginner",
        summary: "Brief summary",
        description: "Full description",
        tags: ["error"],
        examples: [
          {
            code: "const x = 1;",
            language: "typescript",
          },
        ],
      };

      const result = PatternDetailsOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it("should validate with optional fields", () => {
      const minimalOutput = {
        kind: "patternDetails:v1",
        id: "pattern-1",
        title: "Pattern 1",
        category: "error-handling",
        difficulty: "intermediate",
        summary: "Summary",
        description: "Description",
      };

      const result = PatternDetailsOutputSchema.safeParse(minimalOutput);
      expect(result.success).toBe(true);
    });
  });

  describe("ElicitationSchema", () => {
    it("should validate valid elicitation", () => {
      const validElicitation = {
        kind: "needsInput:v1",
        type: "elicitation",
        message: "Please provide a search query",
        needsInput: {
          fields: ["q"],
          reason: "Query is required",
          suggestions: { q: ["error", "service"] },
        },
      };

      const result = ElicitationSchema.safeParse(validElicitation);
      expect(result.success).toBe(true);
    });

    it("should validate with options", () => {
      const elicitationWithOptions = {
        kind: "needsInput:v1",
        type: "elicitation",
        message: "Choose a filter",
        options: [
          { label: "Category", value: "category", description: "Filter by category" },
        ],
      };

      const result = ElicitationSchema.safeParse(elicitationWithOptions);
      expect(result.success).toBe(true);
    });
  });
});
