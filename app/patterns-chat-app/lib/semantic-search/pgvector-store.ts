/**
 * Semantic Search - PostgreSQL pgvector Store
 *
 * Database-backed vector search using PostgreSQL pgvector extension
 * for persistent, scalable semantic search.
 *
 * Features:
 * - Persistent storage in PostgreSQL
 * - Vector similarity search with cosine distance
 * - Efficient IVFFlat indexing for large datasets
 * - Filtering by userId, outcome, tags
 * - Query caching for performance
 */

import { desc, eq, sql, and, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  conversationEmbedding,
  conversationTag,
  searchCache,
  type ConversationEmbedding,
  type ConversationTag,
} from "@/lib/db/schema";
import { generateEmbedding } from "./embeddings";
import type { VectorMetadata, SearchResult } from "./vector-store";

export interface PgVectorStoreOptions {
  userId: string;
  limit?: number;
  minSimilarity?: number;
  outcome?: "solved" | "unsolved" | "partial" | "revisited";
  tags?: string[];
  cacheResults?: boolean;
  cacheTTL?: number; // in seconds
}

/**
 * Database-backed vector store using PostgreSQL pgvector
 */
export class PgVectorStore {
  private dimension: number = 1536;

  constructor() {}

  /**
   * Store a conversation embedding in the database
   */
  async add(
    chatId: string,
    userId: string,
    embedding: number[],
    metadata: Omit<VectorMetadata, "chatId" | "userId">,
    tags: string[]
  ): Promise<string> {
    // Validate dimension
    if (embedding.length !== this.dimension) {
      throw new Error(
        `Embedding dimension ${embedding.length} does not match expected dimension ${this.dimension}`
      );
    }

    // Generate content hash for duplicate detection
    const contentHash = Buffer.from(
      JSON.stringify({
        content: metadata.content,
        timestamp: metadata.timestamp,
      })
    )
      .toString("hex")
      .substring(0, 64);

    try {
      // Check if this conversation already has an embedding
      const existing = await db
        .select()
        .from(conversationEmbedding)
        .where(
          and(
            eq(conversationEmbedding.chatId, chatId),
            eq(conversationEmbedding.userId, userId)
          )
        )
        .limit(1);

      let embeddingId: string;

      if (existing.length > 0) {
        // Update existing embedding
        embeddingId = existing[0].id;
        await db
          .update(conversationEmbedding)
          .set({
            embedding: sql`${sql.raw(JSON.stringify(embedding))}::vector`,
            metadata: {
              tags,
              outcome: metadata.outcome || "partial",
              satisfactionScore: metadata.satisfactionScore,
              contentSummary:
                metadata.content.substring(0, 500) || "No summary",
              messageCount: metadata.content.length, // Rough estimate
              duration: 0,
            } as any,
            contentHash,
            updatedAt: new Date(),
          })
          .where(eq(conversationEmbedding.id, embeddingId));
      } else {
        // Insert new embedding
        const result = await db
          .insert(conversationEmbedding)
          .values({
            chatId,
            userId,
            embedding: sql`${sql.raw(JSON.stringify(embedding))}::vector`,
            metadata: {
              tags,
              outcome: metadata.outcome || "partial",
              satisfactionScore: metadata.satisfactionScore,
              contentSummary:
                metadata.content.substring(0, 500) || "No summary",
              messageCount: metadata.content.length, // Rough estimate
              duration: 0,
            } as any,
            contentHash,
          })
          .returning({ id: conversationEmbedding.id });

        embeddingId = result[0].id;
      }

      // Store tags separately for efficient filtering
      if (tags.length > 0) {
        // Delete existing tags
        await db
          .delete(conversationTag)
          .where(eq(conversationTag.chatId, chatId));

        // Insert new tags
        await db.insert(conversationTag).values(
          tags.map((tag) => ({
            chatId,
            tag,
          }))
        );
      }

      return embeddingId;
    } catch (error) {
      console.error("[PgVectorStore] Error adding embedding:", error);
      throw error;
    }
  }

  /**
   * Search for similar conversations using pgvector
   */
  async search(
    queryVector: number[],
    options: PgVectorStoreOptions
  ): Promise<
    Array<
      SearchResult & {
        vectorSimilarity: number;
        embeddingId: string;
      }
    >
  > {
    const {
      userId,
      limit = 10,
      minSimilarity = 0.3,
      outcome,
      tags = [],
      cacheResults = true,
      cacheTTL = 3600,
    } = options;

    // Validate dimension
    if (queryVector.length !== this.dimension) {
      throw new Error(
        `Query vector dimension ${queryVector.length} does not match expected dimension ${this.dimension}`
      );
    }

    try {
      let results = await db
        .select({
          id: conversationEmbedding.id,
          chatId: conversationEmbedding.chatId,
          userId: conversationEmbedding.userId,
          metadata: conversationEmbedding.metadata,
          // Calculate cosine similarity: 1 - (distance / 2)
          // pgvector <-> operator returns cosine distance [0, 2]
          vectorSimilarity: sql<number>`1 - (${conversationEmbedding.embedding} <-> ${sql.raw(JSON.stringify(queryVector))}::vector) / 2`,
        })
        .from(conversationEmbedding)
        .where(
          and(
            eq(conversationEmbedding.userId, userId),
            outcome
              ? eq(
                  sql`${conversationEmbedding.metadata}->>'outcome'`,
                  outcome
                )
              : undefined,
            sql`1 - (${conversationEmbedding.embedding} <-> ${sql.raw(JSON.stringify(queryVector))}::vector) / 2 >= ${minSimilarity}`
          )
        )
        .orderBy(
          desc(
            sql`1 - (${conversationEmbedding.embedding} <-> ${sql.raw(JSON.stringify(queryVector))}::vector) / 2`
          )
        )
        .limit(limit);

      // Apply tag filtering if specified
      if (tags.length > 0) {
        const tagResults = await db
          .select({ chatId: conversationTag.chatId })
          .from(conversationTag)
          .where(inArray(conversationTag.tag, tags))
          .groupBy(conversationTag.chatId)
          .having(
            sql`count(*) = ${tags.length}`
          );

        const validChatIds = tagResults.map((r) => r.chatId);
        results = results.filter((r) => validChatIds.includes(r.chatId));
      }

      // Cache results if enabled
      if (cacheResults && results.length > 0) {
        const queryHash = Buffer.from(
          JSON.stringify(queryVector.slice(0, 10))
        )
          .toString("hex")
          .substring(0, 64);

        try {
          await db.insert(searchCache).values({
            userId,
            queryHash,
            queryText: "", // Would be populated if we had the original query text
            queryEmbedding: sql`${sql.raw(JSON.stringify(queryVector))}::vector`,
            resultIds: results.map((r) => r.chatId),
            resultCount: results.length,
            expiresAt: new Date(Date.now() + cacheTTL * 1000),
          });
        } catch {
          // Ignore cache errors
        }
      }

      return results.map((r) => {
        const tags = r.metadata?.tags as string[] || [];
        return {
          id: `conv_${r.chatId}`,
          similarity: r.vectorSimilarity,
          vectorSimilarity: r.vectorSimilarity,
          embeddingId: r.id,
          metadata: {
            chatId: r.chatId,
            userId: r.userId,
            type: "conversation" as const,
            content: r.metadata?.contentSummary || "",
            timestamp: new Date().toISOString(),
            outcome: (r.metadata?.outcome || "partial") as any,
            tags,
            satisfactionScore: r.metadata?.satisfactionScore,
          },
        };
      }) as any;
    } catch (error) {
      console.error("[PgVectorStore] Error searching:", error);
      throw error;
    }
  }

  /**
   * Search by tag
   */
  async searchByTag(
    userId: string,
    tag: string,
    limit: number = 100
  ): Promise<ConversationEmbedding[]> {
    try {
      const results = await db
        .select({ embeddingId: conversationTag.chatId })
        .from(conversationTag)
        .where(eq(conversationTag.tag, tag))
        .limit(limit);

      if (results.length === 0) return [];

      const chatIds = results.map((r) => r.embeddingId);

      return await db
        .select()
        .from(conversationEmbedding)
        .where(
          and(
            eq(conversationEmbedding.userId, userId),
            inArray(conversationEmbedding.chatId, chatIds)
          )
        )
        .limit(limit);
    } catch (error) {
      console.error("[PgVectorStore] Error searching by tag:", error);
      throw error;
    }
  }

  /**
   * Get statistics about the vector store
   */
  async getStats(userId: string) {
    try {
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(conversationEmbedding)
        .where(eq(conversationEmbedding.userId, userId));

      const tags = await db
        .select({ tag: conversationTag.tag, count: sql<number>`count(*)` })
        .from(conversationTag)
        .groupBy(conversationTag.tag)
        .limit(10);

      return {
        vectorStoreSize: count[0]?.count || 0,
        embeddingDimension: this.dimension,
        utilizationPercent: Math.min(
          100,
          ((count[0]?.count || 0) / 100000) * 100
        ),
        topTags: tags,
      };
    } catch (error) {
      console.error("[PgVectorStore] Error getting stats:", error);
      return {
        vectorStoreSize: 0,
        embeddingDimension: this.dimension,
        utilizationPercent: 0,
        topTags: [],
      };
    }
  }

  /**
   * Delete embedding by chat ID
   */
  async delete(chatId: string, userId: string): Promise<boolean> {
    try {
      const result = await db
        .delete(conversationEmbedding)
        .where(
          and(
            eq(conversationEmbedding.chatId, chatId),
            eq(conversationEmbedding.userId, userId)
          )
        );

      // Also delete associated tags
      await db.delete(conversationTag).where(eq(conversationTag.chatId, chatId));

      return true;
    } catch (error) {
      console.error("[PgVectorStore] Error deleting embedding:", error);
      return false;
    }
  }
}

// Singleton instance
let pgVectorStoreInstance: PgVectorStore | null = null;

export function getPgVectorStore(): PgVectorStore {
  if (!pgVectorStoreInstance) {
    pgVectorStoreInstance = new PgVectorStore();
  }
  return pgVectorStoreInstance;
}
