/**
 * Supermemory API Service
 */

import { Effect, Context, Data, Layer } from 'effect';
import Supermemory from 'supermemory';
import type { Memory, MemoryMetadata, UploadResult, ProcessingDocument, ProcessingQueue } from '../types.js';

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
  readonly getProcessingQueue: () => Effect.Effect<ProcessingQueue, SupermemoryError>;
  readonly getDocumentStatus: (id: string) => Effect.Effect<ProcessingDocument, SupermemoryError>;
  readonly deleteDocument: (id: string) => Effect.Effect<void, SupermemoryError>;
  readonly pollDocumentStatus: (
    id: string,
    maxWaitMs?: number,
  ) => Effect.Effect<ProcessingDocument, SupermemoryError>;
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

      const getProcessingQueue = () =>
        Effect.gen(function* () {
          const response = yield* Effect.tryPromise({
            try: () =>
              fetch('https://api.supermemory.ai/v3/documents/processing', {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                },
              }).then((res) => {
                if (!res.ok) {
                  throw new Error(`Failed to fetch processing queue: ${res.status}`);
                }
                return res.json();
              }),
            catch: (error) =>
              new SupermemoryError({
                message: `Failed to get processing queue: ${error}`,
              }),
          });

          return response as ProcessingQueue;
        });

      const getDocumentStatus = (id: string) =>
        Effect.gen(function* () {
          const response = yield* Effect.tryPromise({
            try: () =>
              fetch(`https://api.supermemory.ai/v3/documents/${id}`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                },
              }).then((res) => {
                if (!res.ok) {
                  throw new Error(`Failed to fetch document: ${res.status}`);
                }
                return res.json();
              }),
            catch: (error) =>
              new SupermemoryError({
                message: `Failed to get document status: ${error}`,
              }),
          });

          return response as ProcessingDocument;
        });

      const deleteDocument = (id: string) =>
        Effect.gen(function* () {
          yield* Effect.tryPromise({
            try: () =>
              fetch(`https://api.supermemory.ai/v3/documents/${id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                },
              }).then((res) => {
                if (!res.ok) {
                  throw new Error(`Failed to delete document: ${res.status}`);
                }
              }),
            catch: (error) =>
              new SupermemoryError({
                message: `Failed to delete document: ${error}`,
              }),
          });
        });

      const pollDocumentStatus = (id: string, maxWaitMs = 300000) =>
        Effect.gen(function* () {
          const startTime = Date.now();
          const pollInterval = 2000; // 2 seconds

          while (Date.now() - startTime < maxWaitMs) {
            const doc = yield* getDocumentStatus(id);

            if (doc.status === 'done' || doc.status === 'failed') {
              return doc;
            }

            // Wait before polling again
            yield* Effect.sync(() => {
              const ms = pollInterval;
              return new Promise<void>((resolve) => setTimeout(resolve, ms));
            });
          }

          return yield* Effect.fail(
            new SupermemoryError({
              message: `Timeout waiting for document ${id} to complete processing`,
            }),
          );
        });

      return {
        listMemories,
        countMemories,
        addMemory,
        searchMemories,
        getProcessingQueue,
        getDocumentStatus,
        deleteDocument,
        pollDocumentStatus,
      };
    });
