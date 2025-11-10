import type {
  DocumentSearchOptions,
  DocumentSearchResult,
  Memory,
  MemoryMetadata,
  MemorySearchOptions,
  MemorySearchResult,
  ProcessingDocument,
  ProcessingQueue,
  ProfileComparison,
  ProfileStats,
  UserProfile,
  UserProfileWithSearch,
} from "../../types.js";

/**
 * SupermemoryService Types
 * Core type definitions for Supermemory API interactions
 */

export type {
  DocumentSearchOptions,
  DocumentSearchResult,
  Memory,
  MemoryMetadata,
  MemorySearchOptions,
  MemorySearchResult,
  ProcessingDocument,
  ProcessingQueue,
  ProfileComparison,
  ProfileStats,
  UserProfile,
  UserProfileWithSearch,
};

export interface SupermemoryClientConfig {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly timeout?: number;
}
