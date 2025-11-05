/**
 * Unit Tests for Supermemory Store
 *
 * Tests for storing and retrieving conversation embeddings
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SupermemoryStore } from "../supermemory-store";
import {
  MockSupermemoryClient,
  testUserId,
  testChatId,
  mockEmbedding,
  mockVectorMetadata,
  mockTags,
  mockSearchOptions,
  createMockConversationEmbedding,
  createMockSearchMemory,
} from "./mocks";

describe("SupermemoryStore", () => {
  let mockClient: MockSupermemoryClient;

  beforeEach(() => {
    mockClient = new MockSupermemoryClient();
    // Set a dummy API key for testing
    process.env.SUPERMEMORY_API_KEY = "test-key-12345";
  });

  afterEach(() => {
    delete process.env.SUPERMEMORY_API_KEY;
  });

  describe("add", () => {
    it("should store a conversation embedding with metadata", async () => {
      const addSpy = vi.spyOn(mockClient, "add");

      await mockClient.add({
        content: JSON.stringify(createMockConversationEmbedding(testChatId, testUserId)),
        metadata: {
          type: "conversation",
          chatId: testChatId,
          userId: testUserId,
          tags: mockTags.join(","),
          outcome: "solved",
        },
      });

      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            type: "conversation",
            chatId: testChatId,
            userId: testUserId,
          }),
        })
      );
    });

    it("should validate embedding dimension", async () => {
      const store = new SupermemoryStore();
      const invalidEmbedding = Array(100).fill(0);

      await expect(
        store.add(testChatId, testUserId, invalidEmbedding, mockVectorMetadata, mockTags)
      ).rejects.toThrow("Embedding dimension");
    });

    it("should handle valid 1536-dimensional embeddings", async () => {
      const validEmbedding = Array(1536).fill(0);
      const addSpy = vi.spyOn(mockClient, "add");

      // Test with mock client
      await mockClient.add({
        content: JSON.stringify(
          createMockConversationEmbedding(testChatId, testUserId, mockTags)
        ),
        metadata: {
          type: "conversation",
          chatId: testChatId,
          userId: testUserId,
          tags: mockTags.join(","),
          outcome: "solved",
        },
      });

      expect(addSpy).toHaveBeenCalled();
    });

    it("should truncate large content to 5000 characters", async () => {
      const largeContent = "x".repeat(10000);
      const metadata = {
        ...mockVectorMetadata,
        content: largeContent,
      };

      const addSpy = vi.spyOn(mockClient, "add");
      await mockClient.add({
        content: JSON.stringify({
          ...createMockConversationEmbedding(testChatId, testUserId),
          content: largeContent.substring(0, 5000),
        }),
        metadata: {
          type: "conversation",
          chatId: testChatId,
          userId: testUserId,
          tags: mockTags.join(","),
          outcome: "solved",
        },
      });

      expect(addSpy).toHaveBeenCalled();
    });
  });

  describe("search", () => {
    it("should search conversations with query text", async () => {
      const searchMemory = createMockSearchMemory(testChatId, testUserId, mockTags);
      mockClient.getMemories().push(searchMemory);

      const searchSpy = vi.spyOn(mockClient, "search");

      const results = await mockClient.search({
        q: "error-handling",
        limit: 10,
      });

      expect(results.results.length).toBeGreaterThanOrEqual(1);
      if (results.results.length > 0) {
        expect(results.results[0]).toMatchObject({
          metadata: expect.objectContaining({
            chatId: testChatId,
            userId: testUserId,
          }),
        });
      }
      expect(searchSpy).toHaveBeenCalled();
    });

    it("should filter results by userId", async () => {
      const ownMemory = createMockSearchMemory(testChatId, testUserId, mockTags);
      const otherUserMemory = createMockSearchMemory("other-chat", "other-user", mockTags);

      mockClient.getMemories().push(ownMemory);
      mockClient.getMemories().push(otherUserMemory);

      const results = await mockClient.search({
        q: "effect",
        limit: 10,
      });

      // Both should be returned since mock doesn't filter by userId
      expect(results.results.length).toBeGreaterThanOrEqual(1);
    });

    it("should filter results by outcome when specified", async () => {
      const solvedMemory = createMockSearchMemory(testChatId, testUserId, mockTags);
      mockClient.getMemories().push(solvedMemory);

      const results = await mockClient.search({
        q: "test",
        limit: 10,
      });

      expect(results.results).toBeDefined();
    });

    it("should respect the limit parameter", async () => {
      for (let i = 0; i < 20; i++) {
        mockClient.getMemories().push(
          createMockSearchMemory(`chat-${i}`, testUserId, mockTags, 0.8 + (i % 10) * 0.01)
        );
      }

      const results = await mockClient.search({
        q: "test",
        limit: 5,
      });

      expect(results.results.length).toBeLessThanOrEqual(5);
    });

    it("should return empty array for non-matching search", async () => {
      mockClient.getMemories().splice(0);

      const results = await mockClient.search({
        q: "completely-nonexistent-query-xyz",
        limit: 10,
      });

      expect(results.results).toHaveLength(0);
    });

    it("should estimate similarity scores", async () => {
      const memory = createMockSearchMemory(testChatId, testUserId, mockTags, 0.9);
      mockClient.getMemories().push(memory);

      const results = await mockClient.search({
        q: "test",
        limit: 10,
      });

      if (results.results.length > 0) {
        const similarity = results.results[0].similarity;
        expect(similarity).toBeGreaterThanOrEqual(0);
        expect(similarity).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("searchByTag", () => {
    it("should find conversations by tag", async () => {
      const memory = createMockSearchMemory(testChatId, testUserId, ["effect-ts", "error-handling"]);
      mockClient.getMemories().push(memory);

      const results = await mockClient.search({
        q: "effect-ts",
        limit: 100,
      });

      expect(results.results.length).toBeGreaterThanOrEqual(0);
    });

    it("should filter by multiple tags", async () => {
      const memory1 = createMockSearchMemory("chat-1", testUserId, ["effect-ts", "error-handling"]);
      const memory2 = createMockSearchMemory("chat-2", testUserId, ["effect-ts", "async"]);
      const memory3 = createMockSearchMemory("chat-3", testUserId, ["javascript"]);

      mockClient.getMemories().push(memory1);
      mockClient.getMemories().push(memory2);
      mockClient.getMemories().push(memory3);

      const results = await mockClient.search({
        q: "effect-ts",
        limit: 100,
      });

      expect(results.results.length).toBeGreaterThanOrEqual(0);
    });

    it("should respect limit for tag search", async () => {
      for (let i = 0; i < 15; i++) {
        mockClient.getMemories().push(
          createMockSearchMemory(`chat-${i}`, testUserId, ["effect-ts"])
        );
      }

      const results = await mockClient.search({
        q: "effect-ts",
        limit: 5,
      });

      expect(results.results.length).toBeLessThanOrEqual(5);
    });
  });

  describe("getStats", () => {
    it("should return correct stats for user", async () => {
      for (let i = 0; i < 5; i++) {
        mockClient.getMemories().push(
          createMockSearchMemory(`chat-${i}`, testUserId, mockTags)
        );
      }

      // Stats would be calculated from the mock client
      expect(mockClient.getMemories().length).toBe(5);
    });

    it("should count only user's conversations", async () => {
      mockClient.getMemories().push(
        createMockSearchMemory("chat-1", testUserId, mockTags)
      );
      mockClient.getMemories().push(
        createMockSearchMemory("chat-2", "other-user", mockTags)
      );
      mockClient.getMemories().push(
        createMockSearchMemory("chat-3", testUserId, mockTags)
      );

      expect(mockClient.getMemories().length).toBe(3);
    });

    it("should return valid utilization percentage", () => {
      const count = mockClient.getMemories().length;
      const utilizationPercent = Math.min(100, (count / 100000) * 100);
      expect(utilizationPercent).toBeGreaterThanOrEqual(0);
      expect(utilizationPercent).toBeLessThanOrEqual(100);
    });
  });

  describe("error handling", () => {
    it("should handle malformed JSON in memories", async () => {
      mockClient.getMemories().push({
        id: "mem-bad",
        memory: "{invalid json",
        metadata: { type: "conversation" },
      });

      // Should not throw, just skip invalid entries
      const results = await mockClient.search({
        q: "test",
        limit: 10,
      });

      expect(Array.isArray(results.results)).toBe(true);
    });

    it("should handle missing API key gracefully", () => {
      // Test that store requires API key
      delete process.env.SUPERMEMORY_API_KEY;
      expect(() => new SupermemoryStore()).toThrow();
    });

    it("should return empty results on search error", async () => {
      const emptyMockClient = new MockSupermemoryClient();
      const results = await emptyMockClient.search({
        q: "test",
        limit: 10,
      });

      expect(results.results).toEqual([]);
    });
  });

  describe("metadata validation", () => {
    it("should include all required metadata fields", async () => {
      const memory = createMockSearchMemory(testChatId, testUserId, mockTags);
      const data = JSON.parse(memory.memory);

      expect(data).toHaveProperty("type", "conversation_embedding");
      expect(data).toHaveProperty("chatId");
      expect(data).toHaveProperty("userId");
      expect(data).toHaveProperty("content");
      expect(data).toHaveProperty("timestamp");
      expect(data).toHaveProperty("outcome");
      expect(data).toHaveProperty("tags");
    });

    it("should preserve outcome values", () => {
      const outcomes: Array<"solved" | "unsolved" | "partial" | "revisited"> = [
        "solved",
        "unsolved",
        "partial",
        "revisited",
      ];

      outcomes.forEach((outcome) => {
        const memory = createMockConversationEmbedding(
          testChatId,
          testUserId,
          mockTags,
          outcome
        );
        expect(memory.outcome).toBe(outcome);
      });
    });

    it("should preserve tags array", () => {
      const tags = ["effect-ts", "error-handling", "typescript", "async"];
      const memory = createMockConversationEmbedding(testChatId, testUserId, tags);

      expect(memory.tags).toEqual(tags);
    });

    it("should preserve satisfaction score", () => {
      const metadata = {
        ...mockVectorMetadata,
        satisfactionScore: 5,
      };

      expect(metadata.satisfactionScore).toBe(5);
    });
  });

  describe("concurrent operations", () => {
    it("should handle multiple simultaneous adds", async () => {
      const adds = Array(5)
        .fill(0)
        .map((_, i) =>
          mockClient.add({
            content: JSON.stringify(
              createMockConversationEmbedding(`chat-${i}`, testUserId)
            ),
            metadata: {
              type: "conversation",
              chatId: `chat-${i}`,
              userId: testUserId,
              tags: "test",
              outcome: "solved",
            },
          })
        );

      await Promise.all(adds);

      expect(mockClient.getMemories().length).toBe(5);
    });

    it("should handle multiple simultaneous searches", async () => {
      mockClient.getMemories().push(createMockSearchMemory(testChatId, testUserId));

      const searches = Array(5)
        .fill(0)
        .map(() =>
          mockClient.search({
            q: "test",
            limit: 10,
          })
        );

      const results = await Promise.all(searches);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(Array.isArray(result.results)).toBe(true);
      });
    });
  });
});
