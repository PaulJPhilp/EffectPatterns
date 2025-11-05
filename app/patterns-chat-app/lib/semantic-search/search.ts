/**
 * Semantic Search - Main Search Module
 *
 * Provides hybrid search combining:
 * 1. Vector/semantic search (meaning-based)
 * 2. Keyword search (exact match)
 * 3. Intelligent ranking (relevance, recency, satisfaction)
 *
 * Usage:
 *   const results = await semanticSearchConversations(userId, "error handling")
 */

import { generateEmbedding } from "./embeddings";
import { getSupermemoryStore } from "./supermemory-store";

export interface SemanticSearchOptions {
  limit?: number;
  minSimilarity?: number;
  keywordWeight?: number;
  semanticWeight?: number;
  recencyWeight?: number;
  satisfactionWeight?: number;
  filters?: {
    tags?: string[];
    outcome?: "solved" | "unsolved" | "partial" | "revisited";
    dateRange?: [string, string];
  };
}

export interface SearchScore {
  vectorSimilarity: number;
  keywordRelevance: number;
  recencyBoost: number;
  satisfactionBoost: number;
  finalScore: number;
}

export interface SemanticSearchResult {
  id: string;
  metadata: {
    chatId: string;
    userId: string;
    type: string;
    content: string;
    timestamp: string;
    outcome?: string;
    tags?: string[];
    satisfactionScore?: number;
  };
  score: SearchScore;
}

export interface PaginatedSearchResults {
  results: SemanticSearchResult[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  nextOffset?: number;
}

/**
 * Search conversations using semantic (vector) search
 *
 * Finds conversations similar in meaning to the query,
 * even if keywords don't match exactly.
 *
 * Example:
 *   // Finds "exception handling" even when querying "error handling"
 *   const results = await semanticSearchConversations(
 *     "user-123",
 *     "how to handle errors",
 *     { limit: 5, filters: { outcome: "solved" } }
 *   );
 */
export const semanticSearchConversations = async (
  userId: string,
  query: string,
  options: SemanticSearchOptions = {}
): Promise<SemanticSearchResult[]> => {
  const {
    limit = 10,
    minSimilarity = 0.3,
    keywordWeight = 0.3,
    semanticWeight = 0.6,
    recencyWeight = 0.07,
    satisfactionWeight = 0.03,
    filters = {},
  } = options;

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);

  // Get Supermemory store and search
  const supermemoryStore = getSupermemoryStore();
  const vectorResults = await supermemoryStore.search(
    queryEmbedding.vector,
    query,
    {
      userId,
      limit: limit * 3, // Get more to filter and rank
      minSimilarity,
      outcome: filters.outcome,
      tags: filters.tags,
    }
  );

  // Process results with scoring
  let scoredResults: SemanticSearchResult[] = vectorResults.map((result) => {
    const keywordScore = calculateKeywordRelevance(query, result.metadata.content);
    const recencyScore = calculateRecencyBoost(result.metadata.timestamp);
    const satisfactionScore = calculateSatisfactionBoost(
      result.metadata.satisfactionScore
    );

    const finalScore =
      result.vectorSimilarity * semanticWeight +
      keywordScore * keywordWeight +
      recencyScore * recencyWeight +
      satisfactionScore * satisfactionWeight;

    return {
      id: result.id,
      metadata: result.metadata,
      score: {
        vectorSimilarity: result.vectorSimilarity,
        keywordRelevance: keywordScore,
        recencyBoost: recencyScore,
        satisfactionBoost: satisfactionScore,
        finalScore,
      },
    };
  });

  // Apply date range filter if specified
  if (filters.dateRange) {
    const [startDate, endDate] = filters.dateRange;
    scoredResults = scoredResults.filter((r) => {
      const timestamp = r.metadata.timestamp;
      return timestamp >= startDate && timestamp <= endDate;
    });
  }

  // Sort by final score and return top K
  return scoredResults
    .sort((a, b) => b.score.finalScore - a.score.finalScore)
    .slice(0, limit);
};

/**
 * Search conversations by tag
 *
 * Example:
 *   const results = await searchByTag("user-123", "effect-ts");
 */
export const searchByTag = async (
  userId: string,
  tag: string,
  options: { limit?: number } = {}
): Promise<SemanticSearchResult[]> => {
  const supermemoryStore = getSupermemoryStore();
  const items = await supermemoryStore.searchByTag(userId, tag, options.limit || 100);

  const results = items.map((item) => ({
    id: item.id,
    metadata: item.metadata,
    score: {
      vectorSimilarity: 1.0,
      keywordRelevance: 1.0,
      recencyBoost: calculateRecencyBoost(item.metadata.timestamp),
      satisfactionBoost: calculateSatisfactionBoost(
        item.metadata.satisfactionScore
      ),
      finalScore: 1.0,
    },
  }))
    .slice(0, options.limit || 20);

  return results as SemanticSearchResult[];
};

/**
 * Get related conversations
 *
 * Finds conversations related to a specific conversation
 * (other conversations with similar topics/tags)
 *
 * Example:
 *   const related = await getRelatedConversations("user-123", "chat-456");
 */
export const getRelatedConversations = async (
  userId: string,
  chatId: string,
  options: { limit?: number } = {}
): Promise<SemanticSearchResult[]> => {
  // For now, return empty array since we'd need the embedding of the current conversation
  // This can be enhanced by storing the embedding and querying similar conversations
  return [];
};

/**
 * Calculate keyword relevance score (0-1)
 *
 * Simple fuzzy matching: how many words from query appear in content
 */
const calculateKeywordRelevance = (query: string, content: string): number => {
  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3);
  const contentLower = content.toLowerCase();

  if (queryWords.length === 0) return 0;

  const matches = queryWords.filter(word => contentLower.includes(word)).length;
  return matches / queryWords.length;
};

/**
 * Calculate recency boost (0-1)
 *
 * More recent conversations get higher scores
 * - 1.0: Within 1 day
 * - 0.5: 1-7 days
 * - 0.1: 7-30 days
 * - 0.01: 30+ days
 */
const calculateRecencyBoost = (timestamp: string): number => {
  const now = new Date();
  const then = new Date(timestamp);
  const daysDiff = (now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24);

  if (daysDiff <= 1) return 1.0;
  if (daysDiff <= 7) return 0.5;
  if (daysDiff <= 30) return 0.1;
  return 0.01;
};

/**
 * Calculate satisfaction boost (0-1)
 *
 * Conversations where user was satisfied get higher scores
 * - Score 5: 1.0 (very satisfied)
 * - Score 4: 0.8
 * - Score 3: 0.6
 * - Score 2: 0.4
 * - Score 1: 0.2
 * - No score: 0.5 (neutral)
 */
const calculateSatisfactionBoost = (
  satisfactionScore?: number
): number => {
  if (!satisfactionScore) return 0.5;
  return Math.max(0, Math.min(1, satisfactionScore / 5));
};

/**
 * Get search statistics for debugging/optimization
 */
export const getSearchStats = async (userId: string): Promise<{
  vectorStoreSize: number;
  embeddingDimension: number;
  utilizationPercent: number;
}> => {
  const supermemoryStore = getSupermemoryStore();
  const stats = await supermemoryStore.getStats(userId);

  return {
    vectorStoreSize: stats.vectorStoreSize,
    embeddingDimension: stats.embeddingDimension,
    utilizationPercent: stats.utilizationPercent,
  };
};

/**
 * Batch search for multiple queries
 *
 * Useful for finding common themes across queries
 */
export const batchSearch = async (
  userId: string,
  queries: string[],
  options: SemanticSearchOptions = {}
): Promise<Map<string, SemanticSearchResult[]>> => {
  const results = new Map<string, SemanticSearchResult[]>();

  for (const query of queries) {
    const queryResults = await semanticSearchConversations(
      userId,
      query,
      options
    );
    results.set(query, queryResults);
  }

  return results;
};

/**
 * Find conversations that match a specific pattern/problem
 *
 * Example: Find all conversations about database performance
 */
export const findProblems = async (
  userId: string,
  problemKeywords: string[],
  options: { limit?: number } = {}
): Promise<SemanticSearchResult[]> => {
  // Search using first keyword to get initial results
  if (problemKeywords.length === 0) return [];

  const primaryKeyword = problemKeywords[0];
  const results = await semanticSearchConversations(userId, primaryKeyword, {
    limit: (options.limit || 20) * 2,
  });

  // Filter to items where content mentions any of the problem keywords
  const filtered = results.filter((result) => {
    const contentLower = result.metadata.content.toLowerCase();
    return problemKeywords.some((keyword) =>
      contentLower.includes(keyword.toLowerCase())
    );
  });

  return filtered.slice(0, options.limit || 20);
};
