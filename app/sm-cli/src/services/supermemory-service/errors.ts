import { Data } from "effect";

/**
 * SupermemoryService Errors
 * Tagged error types for Supermemory API operations
 */

export class SupermemoryError extends Data.TaggedError("SupermemoryError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class MemoryError extends Data.TaggedError("MemoryError")<{
  readonly operation: string;
  readonly cause?: unknown;
}> {}

export class DocumentError extends Data.TaggedError("DocumentError")<{
  readonly documentId: string;
  readonly operation: string;
  readonly cause?: unknown;
}> {}

export class ProfileError extends Data.TaggedError("ProfileError")<{
  readonly userId: string;
  readonly cause?: unknown;
}> {}

export class SearchError extends Data.TaggedError("SearchError")<{
  readonly query: string;
  readonly cause?: unknown;
}> {}

export class ApiKeyError extends Data.TaggedError("ApiKeyError")<{
  readonly message: string;
}> {}

export class TimeoutError extends Data.TaggedError("TimeoutError")<{
  readonly documentId: string;
  readonly timeoutMs: number;
}> {}
