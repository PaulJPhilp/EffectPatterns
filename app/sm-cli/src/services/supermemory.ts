/**
 * Supermemory API Service
 */

import { Effect, Context, Data, Layer } from 'effect';
import Supermemory from 'supermemory';
import type { Memory, MemoryMetadata, UploadResult } from '../types.js';

class SupermemoryError extends Data.TaggedError('SupermemoryError')<{
  message: string;
}> {}

export interface SupermemoryService {
  readonly listMemories: (
    page: number,
    limit: number,
  ) => Effect.Effect<Memory[], SupermemoryError>;
  readonly countMemories: (
    type?: string,
  ) => Effect.Effect<number, SupermemoryError>;
  readonly addMemory: (
    content: string,
    metadata: MemoryMetadata,
  ) => Effect.Effect<string, SupermemoryError>;
  readonly searchMemories: (
    query: string,
    limit: number,
  ) => Effect.Effect<Memory[], SupermemoryError>;
}

export const SupermemoryService = Context.GenericTag<SupermemoryService>(
  'SupermemoryService',
);

export const SupermemoryServiceLive = (apiKey: string): Effect.Effect<SupermemoryService, SupermemoryError> =>
  Effect.gen(function* () {
      if (!apiKey) {
        return yield* Effect.fail(
          new SupermemoryError({
            message: 'SUPERMEMORY_API_KEY is not set',
          }),
        );
      }

      const client = new Supermemory({ apiKey });

      const listMemories = (page: number, limit: number) =>
        Effect.gen(function* () {
          const response = yield* Effect.tryPromise({
            try: () =>
              (client.memories as any).list({
                page,
                limit,
              }),
            catch: (error) =>
              new SupermemoryError({
                message: `Failed to list memories: ${error}`,
              }),
          });

          if (!(response as any)?.memories) {
            return [];
          }

          return (response as any).memories as Memory[];
        });

      const countMemories = (type?: string) =>
        Effect.gen(function* () {
          let count = 0;
          let page = 1;
          let hasMore = true;

          while (hasMore) {
            const memories = yield* listMemories(page, 100);

            if (memories.length === 0) {
              hasMore = false;
              break;
            }

            const filtered = type
              ? memories.filter((m) => (m as any)?.type === type || (m.metadata as any)?.type === type)
              : memories;

            count += filtered.length;
            page++;

            if (memories.length < 100) {
              hasMore = false;
            }
          }

          return count;
        });

      const addMemory = (content: string, metadata: MemoryMetadata) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              (client.memories as any).add({
                content,
                metadata: metadata as any,
              }),
            catch: (error) =>
              new SupermemoryError({
                message: `Failed to add memory: ${error}`,
              }),
          });

          if (!(result as any)?.id) {
            return yield* Effect.fail(
              new SupermemoryError({
                message: 'No ID returned from Supermemory API',
              }),
            );
          }

          return (result as any).id as string;
        });

      const searchMemories = (query: string, limit: number) =>
        Effect.gen(function* () {
          const results = yield* Effect.tryPromise({
            try: () =>
              (client.search as any).memories({
                q: query,
                limit,
              }),
            catch: (error) =>
              new SupermemoryError({
                message: `Failed to search memories: ${error}`,
              }),
          });

          if (!(results as any)?.results) {
            return [];
          }

          return (results as any).results as Memory[];
        });

      return {
        listMemories,
        countMemories,
        addMemory,
        searchMemories,
      };
    });
