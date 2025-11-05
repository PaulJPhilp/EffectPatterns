/**
 * Test Mocks and Fixtures
 *
 * Mock implementations for Supermemory and related services
 */

import type { SupermemoryStoreOptions, SupermemorySearchResult } from "../supermemory-store";
import type { VectorMetadata } from "../vector-store";

/**
 * Mock Supermemory client
 */
export class MockSupermemoryClient {
  private memories: Array<{
    id: string;
    memory: string;
    metadata: Record<string, any>;
    similarity?: number;
  }> = [];

  async add(params: { content: string; metadata: Record<string, any> }) {
    const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    this.memories.push({
      id,
      memory: params.content,
      metadata: params.metadata,
      similarity: 1.0,
    });
    return { id };
  }

  async search(params: { q: string; limit?: number }) {
    const limit = params.limit || 10;
    // Simple keyword-based search mock
    const results = this.memories
      .filter((m) =>
        m.memory.toLowerCase().includes(params.q.toLowerCase()) ||
        JSON.stringify(m.metadata).toLowerCase().includes(params.q.toLowerCase())
      )
      .slice(0, limit)
      .map((m) => ({
        ...m,
        similarity: 0.8 + Math.random() * 0.2, // Random score between 0.8-1.0
      }));

    return { results };
  }

  clear() {
    this.memories = [];
  }

  getMemories() {
    return this.memories;
  }
}

/**
 * Test fixtures
 */
export const testUserId = "test-user-123";
export const testChatId = "test-chat-456";

export const mockEmbedding = {
  vector: Array(1536).fill(0).map((_, i) => Math.sin(i / 1000)),
  model: "text-embedding-3-small",
  usage: { prompt_tokens: 100 },
};

export const mockVectorMetadata: VectorMetadata = {
  chatId: testChatId,
  userId: testUserId,
  type: "conversation",
  content: "How do I handle errors in Effect? The assistant explained try-catch patterns.",
  timestamp: new Date().toISOString(),
  outcome: "solved",
  tags: ["effect-ts", "error-handling"],
  satisfactionScore: 4,
};

export const mockTags = ["effect-ts", "error-handling", "typescript"];

export const mockSearchResult: SupermemorySearchResult = {
  id: `conv_${testChatId}`,
  similarity: 0.85,
  vectorSimilarity: 0.85,
  embeddingId: `emb_${testChatId}`,
  memoryId: `mem_${testChatId}`,
  metadata: {
    chatId: testChatId,
    userId: testUserId,
    type: "conversation",
    content: mockVectorMetadata.content,
    timestamp: mockVectorMetadata.timestamp,
    outcome: "solved",
    tags: mockTags,
    satisfactionScore: 4,
  },
};

export const mockSearchOptions: SupermemoryStoreOptions = {
  userId: testUserId,
  limit: 10,
  minSimilarity: 0.3,
  outcome: undefined,
  tags: [],
};

/**
 * Mock OpenAI embedding response
 */
export function createMockEmbedding(text: string) {
  const hash = text.split("").reduce((acc, char) => {
    acc = (acc << 5) - acc + char.charCodeAt(0);
    return acc & acc;
  }, 0);

  return {
    vector: Array(1536)
      .fill(0)
      .map((_, i) => Math.sin((hash + i) / 1000)),
    model: "text-embedding-3-small",
    usage: { prompt_tokens: text.split(" ").length },
  };
}

/**
 * Mock conversation messages
 */
export const mockMessages = [
  {
    id: "msg-1",
    role: "user",
    parts: [{ type: "text", text: "How do I handle errors in Effect?" }],
  },
  {
    id: "msg-2",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "In Effect, you can use try-catch patterns or the Effect.try* functions...",
      },
    ],
  },
  {
    id: "msg-3",
    role: "user",
    parts: [{ type: "text", text: "That's very helpful, thanks!" }],
  },
];

/**
 * Mock API responses
 */
export const mockSearchApiResponse = {
  query: "error handling",
  limit: 10,
  minSimilarity: 0.3,
  outcome: null,
  count: 1,
  results: [mockSearchResult],
};

export const mockStatsResponse = {
  vectorStore: {
    size: 5,
    dimension: 1536,
    utilizationPercent: "0.005",
  },
  timestamp: new Date().toISOString(),
};

/**
 * Utility to create mock conversation embedding data
 */
export function createMockConversationEmbedding(
  chatId: string,
  userId: string,
  tags: string[] = ["test"],
  outcome: "solved" | "unsolved" | "partial" | "revisited" = "solved"
) {
  return {
    type: "conversation_embedding",
    chatId,
    userId,
    content: `Test conversation about ${tags.join(", ")}`,
    timestamp: new Date().toISOString(),
    outcome,
    tags,
    embedding: Array(100)
      .fill(0)
      .map(() => Math.random()),
    satisfactionScore: 4,
  };
}

/**
 * Utility to create mock search memory result
 */
export function createMockSearchMemory(
  chatId: string,
  userId: string,
  tags: string[] = ["test"],
  similarity: number = 0.85
) {
  const data = createMockConversationEmbedding(chatId, userId, tags);
  return {
    id: `mem_${chatId}`,
    memory: JSON.stringify(data),
    metadata: {
      type: "conversation",
      chatId,
      userId,
      tags: tags.join(","),
      outcome: "solved",
      timestamp: data.timestamp,
    },
    similarity,
  };
}
