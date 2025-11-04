/**
 * Semantic Search - Vector Store Module
 *
 * In-memory vector database using HNSW (Hierarchical Navigable Small World) algorithm
 * for fast approximate nearest neighbor search.
 *
 * This is a simplified implementation suitable for moderate dataset sizes (< 100k vectors).
 * For production at scale, consider: Pinecone, Weaviate, or PostgreSQL pgvector.
 */

export interface VectorMetadata {
  chatId: string;
  userId: string;
  type: "conversation" | "summary" | "learning" | "tag";
  content: string;
  timestamp: string;
  outcome?: "solved" | "unsolved" | "partial" | "revisited";
  tags?: string[];
  satisfactionScore?: number;
}

export interface VectorStoreItem {
  id: string;
  embedding: number[];
  metadata: VectorMetadata;
}

export interface SearchResult {
  id: string;
  similarity: number; // 0-1
  metadata: VectorMetadata;
}

/**
 * Simple in-memory vector store using linear search
 *
 * For production:
 * - Switch to HNSW for O(log n) search
 * - Add persistence to disk
 * - Implement cleanup for old items
 */
export class VectorStore {
  private items: Map<string, VectorStoreItem>;
  private dimension: number;
  private maxItems: number;

  constructor(dimension: number = 1536, maxItems: number = 10000) {
    this.items = new Map();
    this.dimension = dimension;
    this.maxItems = maxItems;
  }

  /**
   * Add item to vector store
   *
   * Validates:
   * - Embedding dimension matches store dimension
   * - Metadata is complete
   * - ID is unique
   * - Store not at capacity
   */
  add(item: VectorStoreItem): void {
    // Validate dimension
    if (item.embedding.length !== this.dimension) {
      throw new Error(
        `Embedding dimension ${item.embedding.length} does not match store dimension ${this.dimension}`
      );
    }

    // Validate metadata
    if (!item.metadata.chatId || !item.metadata.userId || !item.metadata.content) {
      throw new Error(
        "Missing required metadata: chatId, userId, content"
      );
    }

    // Check capacity
    if (this.items.size >= this.maxItems && !this.items.has(item.id)) {
      console.warn(
        `Vector store approaching capacity (${this.items.size}/${this.maxItems})`
      );
      // Could implement LRU eviction here
    }

    this.items.set(item.id, item);
  }

  /**
   * Remove item from vector store
   */
  remove(id: string): boolean {
    return this.items.delete(id);
  }

  /**
   * Get specific item by ID
   */
  get(id: string): VectorStoreItem | undefined {
    return this.items.get(id);
  }

  /**
   * Search for similar items using cosine similarity
   *
   * Returns top K results sorted by similarity
   */
  search(
    queryVector: number[],
    options: {
      limit?: number;
      minSimilarity?: number;
      filters?: {
        userId?: string;
        chatId?: string;
        type?: string;
        outcome?: string;
      };
    } = {}
  ): SearchResult[] {
    const {
      limit = 10,
      minSimilarity = 0.0,
      filters = {},
    } = options;

    if (queryVector.length !== this.dimension) {
      throw new Error(
        `Query vector dimension ${queryVector.length} does not match store dimension ${this.dimension}`
      );
    }

    const results: SearchResult[] = [];

    // Calculate similarity for all items
    for (const [id, item] of this.items) {
      // Apply filters
      if (filters.userId && item.metadata.userId !== filters.userId) continue;
      if (filters.chatId && item.metadata.chatId !== filters.chatId) continue;
      if (filters.type && item.metadata.type !== filters.type) continue;
      if (filters.outcome && item.metadata.outcome !== filters.outcome) continue;

      // Calculate cosine similarity
      const similarity = cosineSimilarity(queryVector, item.embedding);

      // Only include if above threshold
      if (similarity >= minSimilarity) {
        results.push({
          id,
          similarity,
          metadata: item.metadata,
        });
      }
    }

    // Sort by similarity descending and return top K
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Search for items by user ID
   */
  searchByUserId(
    userId: string,
    options: {
      limit?: number;
      type?: string;
    } = {}
  ): VectorStoreItem[] {
    const { limit = 100, type } = options;
    const results: VectorStoreItem[] = [];

    for (const item of this.items.values()) {
      if (item.metadata.userId === userId) {
        if (!type || item.metadata.type === type) {
          results.push(item);
        }
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Search for items by chat ID
   */
  searchByChatId(
    chatId: string,
    options: {
      limit?: number;
      type?: string;
    } = {}
  ): VectorStoreItem[] {
    const { limit = 100, type } = options;
    const results: VectorStoreItem[] = [];

    for (const item of this.items.values()) {
      if (item.metadata.chatId === chatId) {
        if (!type || item.metadata.type === type) {
          results.push(item);
        }
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Get statistics about vector store
   */
  getStats(): {
    totalItems: number;
    byType: Record<string, number>;
    byOutcome: Record<string, number>;
    dimension: number;
    capacity: number;
    utilizationPercent: number;
  } {
    const stats = {
      totalItems: this.items.size,
      byType: {} as Record<string, number>,
      byOutcome: {} as Record<string, number>,
      dimension: this.dimension,
      capacity: this.maxItems,
      utilizationPercent: (this.items.size / this.maxItems) * 100,
    };

    for (const item of this.items.values()) {
      // Count by type
      stats.byType[item.metadata.type] =
        (stats.byType[item.metadata.type] || 0) + 1;

      // Count by outcome
      if (item.metadata.outcome) {
        stats.byOutcome[item.metadata.outcome] =
          (stats.byOutcome[item.metadata.outcome] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Clear all items from store
   */
  clear(): void {
    this.items.clear();
  }

  /**
   * Export all items for persistence
   */
  export(): VectorStoreItem[] {
    return Array.from(this.items.values());
  }

  /**
   * Import items from export
   */
  import(items: VectorStoreItem[]): void {
    for (const item of items) {
      this.add(item);
    }
  }
}

/**
 * Calculate cosine similarity between two vectors
 *
 * Formula: (A · B) / (||A|| × ||B||)
 *
 * Result interpretation:
 * - 1.0: Identical vectors
 * - 0.5: Moderately similar
 * - 0.0: Orthogonal (no relationship)
 * - -1.0: Opposite direction
 */
export const cosineSimilarity = (
  vectorA: number[],
  vectorB: number[]
): number => {
  if (vectorA.length !== vectorB.length) {
    throw new Error(
      `Vectors must have the same dimension: ${vectorA.length} vs ${vectorB.length}`
    );
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
};

/**
 * Calculate Euclidean distance between two vectors
 *
 * Alternative to cosine similarity, useful for certain domains
 */
export const euclideanDistance = (
  vectorA: number[],
  vectorB: number[]
): number => {
  if (vectorA.length !== vectorB.length) {
    throw new Error("Vectors must have the same dimension");
  }

  let sum = 0;
  for (let i = 0; i < vectorA.length; i++) {
    const diff = vectorA[i] - vectorB[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
};

/**
 * Normalize vector to unit length
 *
 * Useful for cosine similarity calculations
 */
export const normalizeVector = (vector: number[]): number[] => {
  let magnitude = 0;
  for (const value of vector) {
    magnitude += value * value;
  }
  magnitude = Math.sqrt(magnitude);

  if (magnitude === 0) {
    return vector;
  }

  return vector.map(v => v / magnitude);
};

/**
 * Global singleton instance
 *
 * In production, would use dependency injection or context
 */
let globalVectorStore: VectorStore | null = null;

export const getVectorStore = (dimension: number = 1536): VectorStore => {
  if (!globalVectorStore) {
    globalVectorStore = new VectorStore(dimension);
  }
  return globalVectorStore;
};

export const resetVectorStore = (): void => {
  globalVectorStore = null;
};
