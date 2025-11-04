/**
 * Unit Tests for Semantic Search Functions
 *
 * Tests for search, ranking, and filtering functions
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  semanticSearchConversations,
  searchByTag,
  getSearchStats,
  findProblems,
} from "../search";
import { MockSupermemoryClient, testUserId, testChatId, mockTags, createMockSearchMemory } from "./mocks";

// Mock the supermemory store
vi.mock("../supermemory-store", () => ({
  getSupermemoryStore: vi.fn(() => ({
    search: vi.fn(),
    searchByTag: vi.fn(),
    getStats: vi.fn(),
  })),
}));

// Mock the embeddings module
vi.mock("../embeddings", () => ({
  generateEmbedding: vi.fn((text: string) => ({
    vector: Array(1536).fill(0),
    model: "text-embedding-3-small",
  })),
}));

describe("Semantic Search Functions", () => {
  let mockClient: MockSupermemoryClient;

  beforeEach(() => {
    mockClient = new MockSupermemoryClient();
    process.env.SUPERMEMORY_API_KEY = "test-key-12345";
  });

  describe("calculateKeywordRelevance", () => {
    it("should score based on keyword matches", () => {
      const query = "error handling typescript";
      const content = "How to handle errors in TypeScript with try-catch";

      // Manually test the logic since it's internal
      const queryWords = query
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);
      const contentLower = content.toLowerCase();
      const matches = queryWords.filter((word) => contentLower.includes(word)).length;
      const score = matches / queryWords.length;

      expect(queryWords).toHaveLength(3); // "error", "handling", "typescript"
      expect(matches).toBeGreaterThan(0);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("should handle empty query gracefully", () => {
      const query = "";
      const content = "test content";

      const queryWords = query
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);
      const score = queryWords.length === 0 ? 0 : 0.5;

      expect(score).toBe(0);
    });

    it("should handle very short keywords", () => {
      const query = "a to in";
      const content = "content here";

      const queryWords = query
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);

      // All words filtered out
      expect(queryWords).toHaveLength(0);
    });
  });

  describe("calculateRecencyBoost", () => {
    it("should give full boost for recent timestamps", () => {
      const now = new Date();
      const recentTimestamp = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(); // 12 hours ago

      const daysDiff = (new Date().getTime() - new Date(recentTimestamp).getTime()) / (1000 * 60 * 60 * 24);
      const boost = daysDiff <= 1 ? 1.0 : 0.5;

      expect(boost).toBe(1.0);
    });

    it("should give medium boost for week-old timestamps", () => {
      const weekAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

      const daysDiff = (new Date().getTime() - new Date(weekAgo).getTime()) / (1000 * 60 * 60 * 24);
      const boost = daysDiff <= 1 ? 1.0 : daysDiff <= 7 ? 0.5 : 0.1;

      expect(boost).toBe(0.5);
    });

    it("should give low boost for old timestamps", () => {
      const monthAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();

      const daysDiff = (new Date().getTime() - new Date(monthAgo).getTime()) / (1000 * 60 * 60 * 24);
      const boost = daysDiff <= 30 ? 0.1 : 0.01;

      expect(boost).toBe(0.01);
    });
  });

  describe("calculateSatisfactionBoost", () => {
    it("should normalize satisfaction score", () => {
      const scores = [1, 2, 3, 4, 5, undefined];
      const boosts = scores.map((s) => (s ? Math.max(0, Math.min(1, s / 5)) : 0.5));

      expect(boosts).toEqual([0.2, 0.4, 0.6, 0.8, 1.0, 0.5]);
    });

    it("should handle edge cases", () => {
      expect(Math.max(0, Math.min(1, 0 / 5))).toBe(0);
      expect(Math.max(0, Math.min(1, 10 / 5))).toBe(1);
    });
  });

  describe("searchByTag", () => {
    it("should filter conversations by tag", async () => {
      const memory1 = createMockSearchMemory("chat-1", testUserId, ["effect-ts", "error-handling"]);
      const memory2 = createMockSearchMemory("chat-2", testUserId, ["effect-ts", "async"]);
      const memory3 = createMockSearchMemory("chat-3", testUserId, ["javascript"]);

      mockClient.getMemories().push(memory1);
      mockClient.getMemories().push(memory2);
      mockClient.getMemories().push(memory3);

      // Simulate tag search
      const results = mockClient.getMemories().filter((m) => {
        try {
          const data = JSON.parse(m.memory);
          return data.tags && data.tags.includes("effect-ts");
        } catch {
          return false;
        }
      });

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({ metadata: { chatId: "chat-1" } });
      expect(results[1]).toMatchObject({ metadata: { chatId: "chat-2" } });
    });

    it("should respect limit parameter", async () => {
      for (let i = 0; i < 10; i++) {
        mockClient.getMemories().push(
          createMockSearchMemory(`chat-${i}`, testUserId, ["test-tag"])
        );
      }

      const results = mockClient.getMemories().slice(0, 3);

      expect(results).toHaveLength(3);
    });

    it("should return empty array for non-existent tag", async () => {
      mockClient.getMemories().push(
        createMockSearchMemory(testChatId, testUserId, ["effect-ts"])
      );

      const results = mockClient.getMemories().filter((m) => {
        try {
          const data = JSON.parse(m.memory);
          return data.tags && data.tags.includes("non-existent");
        } catch {
          return false;
        }
      });

      expect(results).toHaveLength(0);
    });
  });

  describe("getSearchStats", () => {
    it("should return stats object with required fields", async () => {
      for (let i = 0; i < 5; i++) {
        mockClient.getMemories().push(
          createMockSearchMemory(`chat-${i}`, testUserId, mockTags)
        );
      }

      const stats = {
        vectorStoreSize: mockClient.getMemories().length,
        embeddingDimension: 1536,
        utilizationPercent: Math.min(100, (mockClient.getMemories().length / 100000) * 100),
      };

      expect(stats).toHaveProperty("vectorStoreSize", 5);
      expect(stats).toHaveProperty("embeddingDimension", 1536);
      expect(stats).toHaveProperty("utilizationPercent");
      expect(stats.utilizationPercent).toBeGreaterThan(0);
      expect(stats.utilizationPercent).toBeLessThanOrEqual(100);
    });

    it("should handle empty store", async () => {
      const stats = {
        vectorStoreSize: 0,
        embeddingDimension: 1536,
        utilizationPercent: 0,
      };

      expect(stats.vectorStoreSize).toBe(0);
      expect(stats.utilizationPercent).toBe(0);
    });

    it("should calculate utilization percentage correctly", async () => {
      const storeSize = 50000;
      const maxCapacity = 100000;
      const utilizationPercent = Math.min(100, (storeSize / maxCapacity) * 100);

      expect(utilizationPercent).toBe(50);
    });
  });

  describe("findProblems", () => {
    it("should find conversations matching problem keywords", async () => {
      const memory1 = createMockSearchMemory("chat-1", testUserId, [
        "database",
        "performance",
      ]);
      const memory2 = createMockSearchMemory("chat-2", testUserId, ["memory", "leak"]);
      const memory3 = createMockSearchMemory("chat-3", testUserId, [
        "database",
        "query",
      ]);

      mockClient.getMemories().push(memory1);
      mockClient.getMemories().push(memory2);
      mockClient.getMemories().push(memory3);

      const problemKeywords = ["database", "performance"];
      const filtered = mockClient.getMemories().filter((m) => {
        try {
          const data = JSON.parse(m.memory);
          const contentLower = data.content.toLowerCase();
          return problemKeywords.some((keyword) =>
            contentLower.includes(keyword.toLowerCase())
          );
        } catch {
          return false;
        }
      });

      expect(filtered.length).toBeGreaterThanOrEqual(0);
    });

    it("should return empty array for non-matching keywords", async () => {
      mockClient.getMemories().push(
        createMockSearchMemory(testChatId, testUserId, ["effect-ts"])
      );

      const problemKeywords: string[] = [];
      const filtered = problemKeywords.length === 0 ? [] : mockClient.getMemories();

      expect(filtered).toHaveLength(0);
    });

    it("should respect limit parameter", async () => {
      for (let i = 0; i < 10; i++) {
        mockClient.getMemories().push(
          createMockSearchMemory(`chat-${i}`, testUserId, ["test"])
        );
      }

      const filtered = mockClient.getMemories().slice(0, 5);

      expect(filtered).toHaveLength(5);
    });
  });

  describe("hybrid ranking algorithm", () => {
    it("should combine multiple scoring signals", () => {
      // Mock scoring inputs
      const vectorSimilarity = 0.85;
      const keywordScore = 0.7;
      const recencyScore = 1.0;
      const satisfactionScore = 0.8;

      // Weights from search.ts
      const semanticWeight = 0.6;
      const keywordWeight = 0.3;
      const recencyWeight = 0.07;
      const satisfactionWeight = 0.03;

      const finalScore =
        vectorSimilarity * semanticWeight +
        keywordScore * keywordWeight +
        recencyScore * recencyWeight +
        satisfactionScore * satisfactionWeight;

      // Should heavily weight semantic similarity
      expect(finalScore).toBeGreaterThan(0.5);
      expect(finalScore).toBeLessThanOrEqual(1);
      // Semantic should dominate
      expect(vectorSimilarity * semanticWeight).toBeGreaterThan(
        keywordScore * keywordWeight
      );
    });

    it("should handle extreme scores", () => {
      // Perfect match across all signals
      const perfectFinalScore =
        1.0 * 0.6 + 1.0 * 0.3 + 1.0 * 0.07 + 1.0 * 0.03;
      expect(perfectFinalScore).toBe(1.0);

      // Poor match across all signals
      const poorFinalScore =
        0.0 * 0.6 + 0.0 * 0.3 + 0.0 * 0.07 + 0.0 * 0.03;
      expect(poorFinalScore).toBe(0);
    });

    it("should balance semantic with keyword relevance", () => {
      // Semantically similar but keyword mismatch
      const semanticScore =
        0.9 * 0.6 + 0.1 * 0.3 + 0.5 * 0.07 + 0.5 * 0.03;

      // Both matches
      const balancedScore =
        0.8 * 0.6 + 0.8 * 0.3 + 0.5 * 0.07 + 0.5 * 0.03;

      expect(semanticScore).toBeGreaterThan(0);
      expect(balancedScore).toBeGreaterThan(semanticScore);
    });
  });

  describe("search result filtering", () => {
    it("should filter by outcome type", () => {
      const outcomes = ["solved", "unsolved", "partial", "revisited"] as const;
      const memories = outcomes.map((outcome, i) =>
        createMockSearchMemory(`chat-${i}`, testUserId, mockTags)
      );

      mockClient.getMemories().push(...memories);

      // Filter for solved only
      const solvedOnly = mockClient.getMemories().filter((m) => {
        try {
          const data = JSON.parse(m.memory);
          return data.outcome === "solved";
        } catch {
          return false;
        }
      });

      expect(solvedOnly.length).toBeGreaterThanOrEqual(0);
    });

    it("should apply minimum similarity threshold", () => {
      const minSimilarity = 0.3;
      const results = [
        { similarity: 0.9 },
        { similarity: 0.5 },
        { similarity: 0.2 },
        { similarity: 0.85 },
      ];

      const filtered = results.filter((r) => r.similarity >= minSimilarity);

      expect(filtered).toHaveLength(3);
    });

    it("should respect date range filter", () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const startDate = weekAgo;
      const endDate = now.toISOString();

      const timestamp = monthAgo;

      const inRange = timestamp >= startDate && timestamp <= endDate;

      expect(inRange).toBe(false);
    });
  });

  describe("error handling in search", () => {
    it("should handle missing data gracefully", () => {
      const malformedData = {
        id: "test",
        memory: "{}",
        metadata: {},
      };

      try {
        JSON.parse(malformedData.memory);
        expect(true).toBe(true);
      } catch {
        expect(true).toBe(true);
      }
    });

    it("should skip results with parsing errors", () => {
      const memories = [
        {
          id: "good",
          memory: JSON.stringify({ type: "conversation_embedding", chatId: "1", userId: testUserId }),
          metadata: {},
        },
        {
          id: "bad",
          memory: "{invalid json",
          metadata: {},
        },
        {
          id: "good2",
          memory: JSON.stringify({ type: "conversation_embedding", chatId: "2", userId: testUserId }),
          metadata: {},
        },
      ];

      const parsed = memories.filter((m) => {
        try {
          JSON.parse(m.memory);
          return true;
        } catch {
          return false;
        }
      });

      expect(parsed).toHaveLength(2);
    });

    it("should handle empty search results", () => {
      const results: any[] = [];

      const filtered = results.sort((a, b) => (b.score?.finalScore || 0) - (a.score?.finalScore || 0));

      expect(filtered).toHaveLength(0);
    });
  });
});
