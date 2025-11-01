/**
 * Semantic Search Module - Public API
 *
 * Exports all semantic search functionality for use throughout the application
 */

// Embeddings
export {
  generateEmbedding,
  generateBatchEmbeddings,
  generateEmbeddingWithCache,
  clearEmbeddingCache,
  getEmbeddingCacheStats,
  cosineSimilarity,
} from "./embeddings";
export type {
  EmbeddingOptions,
  EmbeddingResult,
  EmbeddingError,
} from "./embeddings";

// Vector Store
export {
  VectorStore,
  getVectorStore,
  resetVectorStore,
  cosineSimilarity as vectorStoreCosineSimilarity,
  euclideanDistance,
  normalizeVector,
} from "./vector-store";
export type {
  VectorMetadata,
  VectorStoreItem,
  SearchResult as VectorSearchResult,
} from "./vector-store";

// Semantic Search
export {
  semanticSearchConversations,
  searchByTag,
  getRelatedConversations,
  getSearchStats,
  batchSearch,
  findProblems,
} from "./search";
export type {
  SemanticSearchOptions,
  SearchScore,
  SemanticSearchResult,
} from "./search";
