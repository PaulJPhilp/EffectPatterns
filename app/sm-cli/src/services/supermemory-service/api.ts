import { Effect } from "effect";
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
import type {
  DocumentError,
  MemoryError,
  ProfileError,
  SearchError,
  SupermemoryError,
  TimeoutError,
} from "./errors.js";

/**
 * SupermemoryService API
 * Service interface for Supermemory API interactions
 */

export interface SupermemoryServiceAPI {
  // Memory operations
  readonly listMemories: (
    page: number,
    limit: number
  ) => Effect.Effect<Memory[], MemoryError | SupermemoryError>;

  readonly countMemories: (
    type?: string
  ) => Effect.Effect<number, MemoryError | SupermemoryError>;

  readonly addMemory: (
    content: string,
    metadata: MemoryMetadata
  ) => Effect.Effect<string, MemoryError | SupermemoryError>;

  readonly searchMemories: (
    query: string,
    limit: number
  ) => Effect.Effect<Memory[], SearchError | SupermemoryError>;

  // Document operations
  readonly getProcessingQueue: () => Effect.Effect<
    ProcessingQueue,
    DocumentError | SupermemoryError
  >;

  readonly getDocumentStatus: (
    id: string
  ) => Effect.Effect<ProcessingDocument, DocumentError | SupermemoryError>;

  readonly deleteDocument: (
    id: string
  ) => Effect.Effect<void, DocumentError | SupermemoryError>;

  readonly pollDocumentStatus: (
    id: string,
    maxWaitMs?: number
  ) => Effect.Effect<
    ProcessingDocument,
    DocumentError | TimeoutError | SupermemoryError
  >;

  // User profile operations
  readonly getUserProfile: (
    userId: string
  ) => Effect.Effect<UserProfile, ProfileError | SupermemoryError>;

  readonly getUserProfileWithSearch: (
    userId: string,
    query: string
  ) => Effect.Effect<
    UserProfileWithSearch,
    ProfileError | SearchError | SupermemoryError
  >;

  readonly compareUserProfiles: (
    user1Id: string,
    user2Id: string
  ) => Effect.Effect<ProfileComparison, ProfileError | SupermemoryError>;

  readonly getProfileStats: (
    containerTag: string
  ) => Effect.Effect<ProfileStats, ProfileError | SupermemoryError>;

  // Advanced search operations
  readonly searchDocuments: (
    options: DocumentSearchOptions
  ) => Effect.Effect<DocumentSearchResult, SearchError | SupermemoryError>;

  readonly searchMemoriesAdvanced: (
    options: MemorySearchOptions
  ) => Effect.Effect<MemorySearchResult, SearchError | SupermemoryError>;
}
