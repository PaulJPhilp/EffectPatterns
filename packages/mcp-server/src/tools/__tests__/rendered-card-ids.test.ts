import { describe, it, expect } from "vitest";
import { SearchResultsOutputSchema } from "../../schemas/output-schemas.js";

describe("Rendered Card IDs Contract", () => {
  it("should have renderedCardIds matching first K patterns", () => {
    const output = {
      kind: "patternSearchResults:v1" as const,
      query: { q: "test" },
      metadata: {
        totalCount: 10,
        renderedCards: 10,
        renderedCardIds: ["pattern-1", "pattern-2", "pattern-3", "pattern-4", "pattern-5", "pattern-6", "pattern-7", "pattern-8", "pattern-9", "pattern-10"],
        contractMarkers: {
          index: 1,
          cards: 10,
          version: "v1",
        },
      },
      patterns: [
        { id: "pattern-1", title: "Pattern 1", category: "test", difficulty: "beginner" as const, description: "Test" },
        { id: "pattern-2", title: "Pattern 2", category: "test", difficulty: "beginner" as const, description: "Test" },
        { id: "pattern-3", title: "Pattern 3", category: "test", difficulty: "beginner" as const, description: "Test" },
        { id: "pattern-4", title: "Pattern 4", category: "test", difficulty: "beginner" as const, description: "Test" },
        { id: "pattern-5", title: "Pattern 5", category: "test", difficulty: "beginner" as const, description: "Test" },
        { id: "pattern-6", title: "Pattern 6", category: "test", difficulty: "beginner" as const, description: "Test" },
        { id: "pattern-7", title: "Pattern 7", category: "test", difficulty: "beginner" as const, description: "Test" },
        { id: "pattern-8", title: "Pattern 8", category: "test", difficulty: "beginner" as const, description: "Test" },
        { id: "pattern-9", title: "Pattern 9", category: "test", difficulty: "beginner" as const, description: "Test" },
        { id: "pattern-10", title: "Pattern 10", category: "test", difficulty: "beginner" as const, description: "Test" },
      ],
    };

    const validation = SearchResultsOutputSchema.safeParse(output);
    expect(validation.success).toBe(true);

    if (validation.success) {
      const data = validation.data;
      // renderedCardIds should match first K patterns in order
      const expectedIds = data.patterns.slice(0, data.metadata.renderedCards).map((p) => p.id);
      expect(data.metadata.renderedCardIds).toEqual(expectedIds);
      
      // Contract marker count should match rendered cards
      expect(data.metadata.contractMarkers.cards).toBe(data.metadata.renderedCards);
    }
  });

  it("should handle empty results correctly", () => {
    const output = {
      kind: "patternSearchResults:v1" as const,
      query: { q: "nonexistent" },
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

    const validation = SearchResultsOutputSchema.safeParse(output);
    expect(validation.success).toBe(true);

    if (validation.success) {
      const data = validation.data;
      expect(data.metadata.renderedCardIds).toEqual([]);
      expect(data.metadata.contractMarkers.cards).toBe(0);
    }
  });

  it("should ensure renderedCardIds length matches renderedCards", () => {
    const output = {
      kind: "patternSearchResults:v1" as const,
      query: { q: "test" },
      metadata: {
        totalCount: 5,
        renderedCards: 2,
        renderedCardIds: ["pattern-1", "pattern-2"],
        contractMarkers: {
          index: 1,
          cards: 2,
          version: "v1",
        },
      },
      patterns: [
        { id: "pattern-1", title: "Pattern 1", category: "test", difficulty: "beginner" as const, description: "Test" },
        { id: "pattern-2", title: "Pattern 2", category: "test", difficulty: "beginner" as const, description: "Test" },
        { id: "pattern-3", title: "Pattern 3", category: "test", difficulty: "beginner" as const, description: "Test" },
      ],
    };

    const validation = SearchResultsOutputSchema.safeParse(output);
    expect(validation.success).toBe(true);

    if (validation.success) {
      const data = validation.data;
      expect(data.metadata.renderedCardIds.length).toBe(data.metadata.renderedCards);
      expect(data.metadata.renderedCardIds.length).toBe(data.metadata.contractMarkers.cards);
    }
  });
});
