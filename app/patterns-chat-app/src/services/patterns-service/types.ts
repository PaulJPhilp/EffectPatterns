/**
 * PatternsService Types
 * Core type definitions for patterns, search results, and API interactions
 */

export interface Pattern {
  id: string;
  title: string;
  description: string;
  content: string;
  skillLevel: "beginner" | "intermediate" | "advanced";
  tags: string[];
  useCase?: string[];
  relevanceScore?: number;
  source?: "supermemory";
  url?: string;
}

export interface PatternSearchResult {
  patterns: Pattern[];
  totalCount: number;
  query: string;
  timestamp: number;
}

export interface MemoryRouterRequest {
  query: string;
  projectId?: string;
  container?: string;
  limit?: number;
  threshold?: number;
  rerank?: boolean;
}

export interface MemoryRouterResponse {
  memories: Array<{
    id: string;
    content: string;
    metadata?: Record<string, unknown>;
    relevanceScore?: number;
  }>;
  totalCount: number;
  processedAt: string;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheStats {
  size: number;
  entries: string[];
}

