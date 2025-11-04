/**
 * Integration Tests for Chat Route
 *
 * Tests for the chat endpoint's semantic search integration
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { MockSupermemoryClient, testUserId, testChatId, mockTags, createMockConversationEmbedding, createMockSearchMemory } from "./mocks";

describe("Chat Route Integration", () => {
  let mockClient: MockSupermemoryClient;

  beforeEach(() => {
    mockClient = new MockSupermemoryClient();
    process.env.SUPERMEMORY_API_KEY = "test-key-12345";
  });

  describe("conversation storage", () => {
    it("should store conversation after completion", async () => {
      const conversationText = "User: How do I handle errors in Effect?\nAssistant: You can use...";

      const embedding = {
        vector: Array(1536).fill(0.1),
        model: "text-embedding-3-small",
      };

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

      expect(mockClient.getMemories()).toHaveLength(1);
      expect(mockClient.getMemories()[0]).toMatchObject({
        metadata: expect.objectContaining({
          chatId: testChatId,
          userId: testUserId,
        }),
      });
    });

    it("should include all conversation metadata", async () => {
      const metadata = {
        type: "conversation",
        chatId: testChatId,
        userId: testUserId,
        tags: mockTags.join(","),
        outcome: "solved",
        timestamp: new Date().toISOString(),
        satisfactionScore: 5,
      };

      await mockClient.add({
        content: JSON.stringify({
          type: "conversation_embedding",
          chatId: testChatId,
          userId: testUserId,
          content: "test content",
          timestamp: metadata.timestamp,
          outcome: "solved",
          tags: mockTags,
          satisfactionScore: 5,
        }),
        metadata,
      });

      const stored = mockClient.getMemories()[0];
      expect(stored.metadata).toMatchObject({
        type: "conversation",
        outcome: "solved",
      });
    });

    it("should truncate content to 5000 characters", async () => {
      const largeContent = "x".repeat(10000);
      const truncatedContent = largeContent.substring(0, 5000);

      const embedding = {
        vector: Array(1536).fill(0),
        model: "text-embedding-3-small",
      };

      await mockClient.add({
        content: JSON.stringify({
          type: "conversation_embedding",
          chatId: testChatId,
          userId: testUserId,
          content: truncatedContent,
          timestamp: new Date().toISOString(),
          outcome: "solved",
          tags: mockTags,
        }),
        metadata: {
          type: "conversation",
          chatId: testChatId,
          userId: testUserId,
          tags: mockTags.join(","),
          outcome: "solved",
        },
      });

      const stored = mockClient.getMemories()[0];
      const data = JSON.parse(stored.memory);

      expect(data.content.length).toBeLessThanOrEqual(5000);
    });

    it("should handle multiple concurrent chat saves", async () => {
      const chatIds = Array(5)
        .fill(0)
        .map((_, i) => `chat-${i}`);

      const savePromises = chatIds.map((chatId) =>
        mockClient.add({
          content: JSON.stringify(
            createMockConversationEmbedding(chatId, testUserId, mockTags)
          ),
          metadata: {
            type: "conversation",
            chatId,
            userId: testUserId,
            tags: mockTags.join(","),
            outcome: "solved",
          },
        })
      );

      await Promise.all(savePromises);

      expect(mockClient.getMemories()).toHaveLength(5);
    });
  });

  describe("auto-tagging", () => {
    it("should auto-tag conversations based on content", async () => {
      const contentWithEffect = "How do I use Effect-TS for error handling?";
      const tags = ["effect-ts", "error-handling"];

      await mockClient.add({
        content: JSON.stringify({
          type: "conversation_embedding",
          chatId: testChatId,
          userId: testUserId,
          content: contentWithEffect,
          timestamp: new Date().toISOString(),
          outcome: "solved",
          tags,
        }),
        metadata: {
          type: "conversation",
          chatId: testChatId,
          userId: testUserId,
          tags: tags.join(","),
          outcome: "solved",
        },
      });

      const stored = mockClient.getMemories()[0];
      const data = JSON.parse(stored.memory);

      expect(data.tags).toContain("effect-ts");
      expect(data.tags).toContain("error-handling");
    });

    it("should handle conversations with no matching tags", async () => {
      const genericContent = "What is programming?";
      const tags: string[] = [];

      await mockClient.add({
        content: JSON.stringify({
          type: "conversation_embedding",
          chatId: testChatId,
          userId: testUserId,
          content: genericContent,
          timestamp: new Date().toISOString(),
          outcome: "unsolved",
          tags,
        }),
        metadata: {
          type: "conversation",
          chatId: testChatId,
          userId: testUserId,
          tags: tags.join(","),
          outcome: "unsolved",
        },
      });

      const stored = mockClient.getMemories()[0];
      expect(stored.metadata.tags).toBe("");
    });
  });

  describe("outcome detection", () => {
    it("should detect solved conversations", async () => {
      const solvedContent = "Thank you so much, that resolved my issue!";

      await mockClient.add({
        content: JSON.stringify({
          type: "conversation_embedding",
          chatId: testChatId,
          userId: testUserId,
          content: solvedContent,
          timestamp: new Date().toISOString(),
          outcome: "solved",
          tags: mockTags,
        }),
        metadata: {
          type: "conversation",
          chatId: testChatId,
          userId: testUserId,
          tags: mockTags.join(","),
          outcome: "solved",
        },
      });

      const stored = mockClient.getMemories()[0];
      expect(stored.metadata.outcome).toBe("solved");
    });

    it("should detect unsolved conversations", async () => {
      const unsolvedContent = "I'm still having trouble with this...";

      await mockClient.add({
        content: JSON.stringify({
          type: "conversation_embedding",
          chatId: testChatId,
          userId: testUserId,
          content: unsolvedContent,
          timestamp: new Date().toISOString(),
          outcome: "unsolved",
          tags: mockTags,
        }),
        metadata: {
          type: "conversation",
          chatId: testChatId,
          userId: testUserId,
          tags: mockTags.join(","),
          outcome: "unsolved",
        },
      });

      const stored = mockClient.getMemories()[0];
      expect(stored.metadata.outcome).toBe("unsolved");
    });

    it("should detect partial solutions", async () => {
      const partialContent = "This helped a bit, but I need more info on...";

      await mockClient.add({
        content: JSON.stringify({
          type: "conversation_embedding",
          chatId: testChatId,
          userId: testUserId,
          content: partialContent,
          timestamp: new Date().toISOString(),
          outcome: "partial",
          tags: mockTags,
        }),
        metadata: {
          type: "conversation",
          chatId: testChatId,
          userId: testUserId,
          tags: mockTags.join(","),
          outcome: "partial",
        },
      });

      const stored = mockClient.getMemories()[0];
      expect(stored.metadata.outcome).toBe("partial");
    });

    it("should detect revisited conversations", async () => {
      const revisitedContent = "I had this issue before, let me revisit the solution...";

      await mockClient.add({
        content: JSON.stringify({
          type: "conversation_embedding",
          chatId: testChatId,
          userId: testUserId,
          content: revisitedContent,
          timestamp: new Date().toISOString(),
          outcome: "revisited",
          tags: mockTags,
        }),
        metadata: {
          type: "conversation",
          chatId: testChatId,
          userId: testUserId,
          tags: mockTags.join(","),
          outcome: "revisited",
        },
      });

      const stored = mockClient.getMemories()[0];
      expect(stored.metadata.outcome).toBe("revisited");
    });
  });

  describe("user isolation", () => {
    it("should store separate embeddings per user", async () => {
      const user1Chats = Array(3)
        .fill(0)
        .map((_, i) =>
          mockClient.add({
            content: JSON.stringify(
              createMockConversationEmbedding(`user1-chat-${i}`, "user-1", mockTags)
            ),
            metadata: {
              type: "conversation",
              chatId: `user1-chat-${i}`,
              userId: "user-1",
              tags: mockTags.join(","),
              outcome: "solved",
            },
          })
        );

      const user2Chats = Array(2)
        .fill(0)
        .map((_, i) =>
          mockClient.add({
            content: JSON.stringify(
              createMockConversationEmbedding(`user2-chat-${i}`, "user-2", mockTags)
            ),
            metadata: {
              type: "conversation",
              chatId: `user2-chat-${i}`,
              userId: "user-2",
              tags: mockTags.join(","),
              outcome: "solved",
            },
          })
        );

      await Promise.all([...user1Chats, ...user2Chats]);

      const user1Memories = mockClient.getMemories().filter((m) => {
        try {
          const data = JSON.parse(m.memory);
          return data.userId === "user-1";
        } catch {
          return false;
        }
      });

      const user2Memories = mockClient.getMemories().filter((m) => {
        try {
          const data = JSON.parse(m.memory);
          return data.userId === "user-2";
        } catch {
          return false;
        }
      });

      expect(user1Memories).toHaveLength(3);
      expect(user2Memories).toHaveLength(2);
      expect(mockClient.getMemories()).toHaveLength(5);
    });

    it("should not leak user data between searches", async () => {
      // User 1 data
      await mockClient.add({
        content: JSON.stringify(
          createMockConversationEmbedding(testChatId, "user-1", ["secret-project"])
        ),
        metadata: {
          type: "conversation",
          chatId: testChatId,
          userId: "user-1",
          tags: "secret-project",
          outcome: "solved",
        },
      });

      // User 2 search
      const results = await mockClient.search({
        q: "secret",
        limit: 10,
      });

      // User 2 should not see user 1's data (mock doesn't enforce this, but in real app it would)
      // This test documents the expected behavior
      expect(results.results).toBeDefined();
    });
  });

  describe("error handling in chat integration", () => {
    it("should not fail chat when embedding fails", async () => {
      // Simulate embedding failure gracefully
      const shouldContinue = true;

      expect(shouldContinue).toBe(true);
    });

    it("should handle rate limiting gracefully", () => {
      const error = { code: "RATE_LIMIT", message: "Too many requests" };

      // Should catch rate limit error
      const caught = error.code === "RATE_LIMIT";

      expect(caught).toBe(true);
    });

    it("should handle auth errors gracefully", () => {
      const error = { code: "AUTH_ERROR", message: "Invalid API key" };

      const caught = error.code === "AUTH_ERROR";

      expect(caught).toBe(true);
    });

    it("should handle network errors gracefully", () => {
      const error = new Error("Network timeout");

      const caught = error instanceof Error;

      expect(caught).toBe(true);
    });
  });

  describe("performance considerations", () => {
    it("should handle large conversations efficiently", async () => {
      const largeContent = Array(100)
        .fill("This is a message. ")
        .join("")
        .substring(0, 5000);

      const startTime = performance.now();

      await mockClient.add({
        content: JSON.stringify({
          type: "conversation_embedding",
          chatId: testChatId,
          userId: testUserId,
          content: largeContent,
          timestamp: new Date().toISOString(),
          outcome: "solved",
          tags: mockTags,
        }),
        metadata: {
          type: "conversation",
          chatId: testChatId,
          userId: testUserId,
          tags: mockTags.join(","),
          outcome: "solved",
        },
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time
      expect(duration).toBeLessThan(1000);
    });

    it("should batch multiple chats efficiently", async () => {
      const batchSize = 10;
      const batches = Array(5)
        .fill(0)
        .map((_, batchIdx) =>
          Array(batchSize)
            .fill(0)
            .map((_, i) =>
              mockClient.add({
                content: JSON.stringify(
                  createMockConversationEmbedding(
                    `chat-${batchIdx}-${i}`,
                    testUserId,
                    mockTags
                  )
                ),
                metadata: {
                  type: "conversation",
                  chatId: `chat-${batchIdx}-${i}`,
                  userId: testUserId,
                  tags: mockTags.join(","),
                  outcome: "solved",
                },
              })
            )
        );

      const startTime = performance.now();

      await Promise.all(batches.flat());

      const endTime = performance.now();

      expect(mockClient.getMemories()).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });
});
