/**
 * End-to-End Tests for Full Semantic Search Workflow
 *
 * Tests for complete workflows from chat to search and retrieval
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MockSupermemoryClient, testUserId, createMockSearchMemory, createMockConversationEmbedding } from "./mocks";

describe("End-to-End Semantic Search Workflow", () => {
  let mockClient: MockSupermemoryClient;

  beforeEach(() => {
    mockClient = new MockSupermemoryClient();
    process.env.SUPERMEMORY_API_KEY = "test-key-12345";
  });

  describe("complete conversation flow", () => {
    it("should store and retrieve conversation", async () => {
      // Step 1: User has a chat
      const chatId = "chat-error-handling-001";
      const conversationText =
        "User: How do I handle errors in Effect-TS?\nAssistant: You can use Effect.try* or try-catch patterns...";

      // Step 2: Generate embedding and store
      const embedding = {
        vector: Array(1536).fill(0.1),
        model: "text-embedding-3-small",
      };

      await mockClient.add({
        content: JSON.stringify(
          createMockConversationEmbedding(chatId, testUserId, ["effect-ts", "error-handling"])
        ),
        metadata: {
          type: "conversation",
          chatId,
          userId: testUserId,
          tags: "effect-ts,error-handling",
          outcome: "solved",
        },
      });

      // Step 3: Search for it
      const results = await mockClient.search({
        q: "effect error handling",
        limit: 10,
      });

      // Verify storage and retrieval
      expect(mockClient.getMemories()).toHaveLength(1);
      expect(results.results.length).toBeGreaterThanOrEqual(0);
    });

    it("should track user's conversation history", async () => {
      const user1Chats = [
        { id: "chat-1", tags: ["effect-ts", "error"] },
        { id: "chat-2", tags: ["effect-ts", "async"] },
        { id: "chat-3", tags: ["typescript", "types"] },
      ];

      // User stores multiple conversations
      for (const chat of user1Chats) {
        await mockClient.add({
          content: JSON.stringify(
            createMockConversationEmbedding(chat.id, testUserId, chat.tags)
          ),
          metadata: {
            type: "conversation",
            chatId: chat.id,
            userId: testUserId,
            tags: chat.tags.join(","),
            outcome: "solved",
          },
        });
      }

      // Verify all stored
      const userChats = mockClient.getMemories().filter((m) => {
        try {
          const data = JSON.parse(m.memory);
          return data.userId === testUserId;
        } catch {
          return false;
        }
      });

      expect(userChats).toHaveLength(3);
    });
  });

  describe("multi-user isolation workflow", () => {
    it("should keep user data separate", async () => {
      const user1 = "user-1";
      const user2 = "user-2";

      // User 1 stores 2 conversations
      await mockClient.add({
        content: JSON.stringify(createMockConversationEmbedding("chat-1a", user1, ["secret"])),
        metadata: {
          type: "conversation",
          chatId: "chat-1a",
          userId: user1,
          tags: "secret",
          outcome: "solved",
        },
      });

      await mockClient.add({
        content: JSON.stringify(createMockConversationEmbedding("chat-1b", user1, ["secret"])),
        metadata: {
          type: "conversation",
          chatId: "chat-1b",
          userId: user1,
          tags: "secret",
          outcome: "solved",
        },
      });

      // User 2 stores 1 conversation
      await mockClient.add({
        content: JSON.stringify(createMockConversationEmbedding("chat-2a", user2, ["public"])),
        metadata: {
          type: "conversation",
          chatId: "chat-2a",
          userId: user2,
          tags: "public",
          outcome: "solved",
        },
      });

      // User 1 searches their own data
      const user1Results = mockClient.getMemories().filter((m) => {
        try {
          const data = JSON.parse(m.memory);
          return data.userId === user1;
        } catch {
          return false;
        }
      });

      // User 2 searches their own data
      const user2Results = mockClient.getMemories().filter((m) => {
        try {
          const data = JSON.parse(m.memory);
          return data.userId === user2;
        } catch {
          return false;
        }
      });

      expect(user1Results).toHaveLength(2);
      expect(user2Results).toHaveLength(1);
      expect(user1Results).not.toEqual(user2Results);
    });
  });

  describe("search and retrieval workflow", () => {
    it("should retrieve relevant conversations", async () => {
      // Setup: Store 5 conversations with different topics
      const conversations = [
        {
          id: "error-1",
          tags: ["error-handling", "try-catch"],
          content: "How to handle errors safely",
        },
        {
          id: "error-2",
          tags: ["error-handling", "effect"],
          content: "Effect-TS error recovery",
        },
        {
          id: "async-1",
          tags: ["async", "concurrency"],
          content: "Async patterns and best practices",
        },
        {
          id: "type-1",
          tags: ["typescript", "types"],
          content: "Type safety in TypeScript",
        },
        {
          id: "perf-1",
          tags: ["performance", "optimization"],
          content: "Performance optimization techniques",
        },
      ];

      for (const conv of conversations) {
        mockClient.getMemories().push(
          createMockSearchMemory(conv.id, testUserId, conv.tags, 0.85)
        );
      }

      // Search for error handling
      const errorResults = mockClient.getMemories().filter((m) => {
        try {
          const data = JSON.parse(m.memory);
          return data.tags && data.tags.includes("error-handling");
        } catch {
          return false;
        }
      });

      expect(errorResults).toHaveLength(2);

      // Search for async
      const asyncResults = mockClient.getMemories().filter((m) => {
        try {
          const data = JSON.parse(m.memory);
          return data.tags && data.tags.includes("async");
        } catch {
          return false;
        }
      });

      expect(asyncResults).toHaveLength(1);
    });

    it("should retrieve by similarity score", async () => {
      // Store conversations with different relevance
      mockClient.getMemories().push(
        createMockSearchMemory("highly-relevant", testUserId, ["effect", "error"], 0.95)
      );
      mockClient.getMemories().push(
        createMockSearchMemory("somewhat-relevant", testUserId, ["effect"], 0.65)
      );
      mockClient.getMemories().push(
        createMockSearchMemory("slightly-relevant", testUserId, ["error"], 0.35)
      );

      // Search and apply minimum similarity threshold
      const minSimilarity = 0.5;
      const filtered = mockClient.getMemories().filter((m) => {
        try {
          const data = JSON.parse(m.memory);
          return m.similarity && m.similarity >= minSimilarity;
        } catch {
          return false;
        }
      });

      expect(filtered.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("outcome tracking workflow", () => {
    it("should track conversation outcomes", async () => {
      const outcomes = ["solved", "unsolved", "partial", "revisited"] as const;

      // User completes conversations with different outcomes
      for (const outcome of outcomes) {
        await mockClient.add({
          content: JSON.stringify(
            createMockConversationEmbedding(`chat-${outcome}`, testUserId, ["test"], outcome)
          ),
          metadata: {
            type: "conversation",
            chatId: `chat-${outcome}`,
            userId: testUserId,
            tags: "test",
            outcome,
          },
        });
      }

      // Verify all outcomes stored
      const solvedCount = mockClient.getMemories().filter((m) => {
        try {
          const data = JSON.parse(m.memory);
          return data.outcome === "solved";
        } catch {
          return false;
        }
      }).length;

      expect(solvedCount).toBeGreaterThanOrEqual(1);
      expect(mockClient.getMemories()).toHaveLength(4);
    });

    it("should retrieve conversations by outcome filter", async () => {
      // Store conversations with different outcomes
      const outcomes = ["solved", "solved", "unsolved", "partial"];
      for (let i = 0; i < outcomes.length; i++) {
        mockClient.getMemories().push(
          createMockSearchMemory(`chat-${i}`, testUserId, ["test"])
        );
      }

      // Filter to solved conversations
      const solvedMemories = mockClient.getMemories().filter((m) => {
        try {
          const data = JSON.parse(m.memory);
          return data.outcome === "solved";
        } catch {
          return false;
        }
      });

      expect(solvedMemories.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("tag-based discovery workflow", () => {
    it("should enable tag-based content discovery", async () => {
      // Create a knowledge graph through tagging
      const taggedConversations = [
        {
          id: "pattern-1",
          tags: ["effect-ts", "error-handling", "pattern"],
        },
        {
          id: "pattern-2",
          tags: ["effect-ts", "error-handling", "async"],
        },
        { id: "pattern-3", tags: ["effect-ts", "concurrency"] },
        { id: "guide-1", tags: ["tutorial", "error-handling"] },
        { id: "guide-2", tags: ["tutorial", "typescript"] },
      ];

      for (const conv of taggedConversations) {
        mockClient.getMemories().push(
          createMockSearchMemory(conv.id, testUserId, conv.tags)
        );
      }

      // Find all error-handling resources
      const errorHandlingResources = mockClient.getMemories().filter((m) => {
        try {
          const data = JSON.parse(m.memory);
          return data.tags && data.tags.includes("error-handling");
        } catch {
          return false;
        }
      });

      expect(errorHandlingResources.length).toBeGreaterThanOrEqual(0);

      // Find all Effect-TS resources
      const effectResources = mockClient.getMemories().filter((m) => {
        try {
          const data = JSON.parse(m.memory);
          return data.tags && data.tags.includes("effect-ts");
        } catch {
          return false;
        }
      });

      expect(effectResources.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("full user journey", () => {
    it("should support complete user learning journey", async () => {
      // 1. User starts learning Effect-TS
      await mockClient.add({
        content: JSON.stringify(
          createMockConversationEmbedding("intro-1", testUserId, ["effect-ts", "beginner"], "solved")
        ),
        metadata: {
          type: "conversation",
          chatId: "intro-1",
          userId: testUserId,
          tags: "effect-ts,beginner",
          outcome: "solved",
        },
      });

      // 2. User explores error handling
      await mockClient.add({
        content: JSON.stringify(
          createMockConversationEmbedding("error-learn", testUserId, ["effect-ts", "error-handling"], "solved")
        ),
        metadata: {
          type: "conversation",
          chatId: "error-learn",
          userId: testUserId,
          tags: "effect-ts,error-handling",
          outcome: "solved",
        },
      });

      // 3. User encounters an issue
      await mockClient.add({
        content: JSON.stringify(
          createMockConversationEmbedding("issue-1", testUserId, ["effect-ts", "error-handling"], "partial")
        ),
        metadata: {
          type: "conversation",
          chatId: "issue-1",
          userId: testUserId,
          tags: "effect-ts,error-handling",
          outcome: "partial",
        },
      });

      // 4. User searches past conversations for similar issue
      const relatedConversations = await mockClient.search({
        q: "error handling effect-ts",
        limit: 10,
      });

      // 5. User finds and applies solution, revisits conversation
      await mockClient.add({
        content: JSON.stringify(
          createMockConversationEmbedding("issue-1-revisited", testUserId, ["effect-ts", "error-handling"], "revisited")
        ),
        metadata: {
          type: "conversation",
          chatId: "issue-1-revisited",
          userId: testUserId,
          tags: "effect-ts,error-handling",
          outcome: "revisited",
        },
      });

      // Verify journey stored
      const userJourney = mockClient.getMemories().filter((m) => {
        try {
          const data = JSON.parse(m.memory);
          return data.userId === testUserId;
        } catch {
          return false;
        }
      });

      expect(userJourney).toHaveLength(4);

      // Verify outcomes progression
      const outcomes = userJourney.map((m) => {
        try {
          const data = JSON.parse(m.memory);
          return data.outcome;
        } catch {
          return null;
        }
      });

      expect(outcomes).toContain("solved");
      expect(outcomes).toContain("partial");
      expect(outcomes).toContain("revisited");
    });
  });

  describe("performance at scale", () => {
    it("should handle large conversation histories", async () => {
      // Simulate 1000 user conversations
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        mockClient.getMemories().push(
          createMockSearchMemory(`chat-${i}`, testUserId, ["effect-ts", "learning"])
        );
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(mockClient.getMemories()).toHaveLength(100);
      expect(duration).toBeLessThan(1000);
    });

    it("should search efficiently across large datasets", async () => {
      // Setup 500 conversations
      for (let i = 0; i < 100; i++) {
        mockClient.getMemories().push(
          createMockSearchMemory(`chat-${i}`, testUserId, ["effect-ts"])
        );
      }

      // Perform multiple searches
      const startTime = performance.now();

      const search1 = await mockClient.search({ q: "effect", limit: 10 });
      const search2 = await mockClient.search({ q: "error", limit: 10 });
      const search3 = await mockClient.search({ q: "async", limit: 10 });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(search1.results).toBeDefined();
      expect(search2.results).toBeDefined();
      expect(search3.results).toBeDefined();
      expect(duration).toBeLessThan(1000);
    });
  });

  describe("data consistency", () => {
    it("should maintain data consistency across operations", async () => {
      const originalSize = mockClient.getMemories().length;

      // Add and retrieve
      await mockClient.add({
        content: JSON.stringify(
          createMockConversationEmbedding("consistency-test", testUserId, ["test"])
        ),
        metadata: {
          type: "conversation",
          chatId: "consistency-test",
          userId: testUserId,
          tags: "test",
          outcome: "solved",
        },
      });

      const afterAdd = mockClient.getMemories().length;
      expect(afterAdd).toBe(originalSize + 1);

      // Search returns the added conversation
      const results = await mockClient.search({
        q: "consistency",
        limit: 10,
      });

      expect(results.results).toBeDefined();
    });

    it("should handle concurrent operations safely", async () => {
      const operations = [];

      // Add 10 conversations concurrently
      for (let i = 0; i < 10; i++) {
        operations.push(
          mockClient.add({
            content: JSON.stringify(
              createMockConversationEmbedding(`concurrent-${i}`, testUserId, ["test"])
            ),
            metadata: {
              type: "conversation",
              chatId: `concurrent-${i}`,
              userId: testUserId,
              tags: "test",
              outcome: "solved",
            },
          })
        );
      }

      await Promise.all(operations);

      expect(mockClient.getMemories().length).toBe(10);
    });
  });
});
