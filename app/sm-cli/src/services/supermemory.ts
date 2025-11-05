/**
 * Supermemory API Service
 */

import { Effect, Context, Data, Layer } from 'effect';
import Supermemory from 'supermemory';
import type {
  Memory,
  MemoryMetadata,
  UploadResult,
  ProcessingDocument,
  ProcessingQueue,
  UserProfile,
  UserProfileWithSearch,
  ProfileComparison,
  ProfileStats,
} from '../types.js';

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
  readonly getUserProfile: (userId: string) => Effect.Effect<UserProfile, SupermemoryError>;
  readonly getUserProfileWithSearch: (
    userId: string,
    query: string,
  ) => Effect.Effect<UserProfileWithSearch, SupermemoryError>;
  readonly compareUserProfiles: (
    user1Id: string,
    user2Id: string,
  ) => Effect.Effect<ProfileComparison, SupermemoryError>;
  readonly getProfileStats: (containerTag: string) => Effect.Effect<ProfileStats, SupermemoryError>;
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

      const getUserProfile = (userId: string) =>
        Effect.gen(function* () {
          const response = yield* Effect.tryPromise({
            try: () =>
              fetch('https://api.supermemory.ai/v4/profile', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  containerTag: userId,
                }),
              }).then((res) => {
                if (!res.ok) {
                  throw new Error(`Failed to fetch user profile: ${res.status}`);
                }
                return res.json();
              }),
            catch: (error) =>
              new SupermemoryError({
                message: `Failed to get user profile: ${error}`,
              }),
          });

          if (!(response as any)?.profile) {
            return yield* Effect.fail(
              new SupermemoryError({
                message: `No profile data returned for user ${userId}`,
              }),
            );
          }

          const profile = (response as any).profile;
          return {
            userId,
            static: profile.static || [],
            dynamic: profile.dynamic || [],
            retrievedAt: new Date().toISOString(),
          } as UserProfile;
        });

      const getUserProfileWithSearch = (userId: string, query: string) =>
        Effect.gen(function* () {
          const response = yield* Effect.tryPromise({
            try: () =>
              fetch('https://api.supermemory.ai/v4/profile', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  containerTag: userId,
                  q: query,
                }),
              }).then((res) => {
                if (!res.ok) {
                  throw new Error(`Failed to fetch profile with search: ${res.status}`);
                }
                return res.json();
              }),
            catch: (error) =>
              new SupermemoryError({
                message: `Failed to get profile with search: ${error}`,
              }),
          });

          if (!(response as any)?.profile) {
            return yield* Effect.fail(
              new SupermemoryError({
                message: `No profile data returned for user ${userId}`,
              }),
            );
          }

          const profile = (response as any).profile;
          const searchResults = (response as any).searchResults || {};

          return {
            profile: {
              userId,
              static: profile.static || [],
              dynamic: profile.dynamic || [],
              retrievedAt: new Date().toISOString(),
            },
            searchResults: (searchResults.results || []) as any[],
            searchQuery: query,
            searchTiming: searchResults.timing || 0,
          } as UserProfileWithSearch;
        });

      const compareUserProfiles = (user1Id: string, user2Id: string) =>
        Effect.gen(function* () {
          const profile1 = yield* getUserProfile(user1Id);
          const profile2 = yield* getUserProfile(user2Id);

          const static1Set = new Set(profile1.static);
          const static2Set = new Set(profile2.static);
          const dynamic1Set = new Set(profile1.dynamic);
          const dynamic2Set = new Set(profile2.dynamic);

          const commonStatic = Array.from(static1Set).filter((s) => static2Set.has(s));
          const uniqueStatic1 = Array.from(static1Set).filter((s) => !static2Set.has(s));
          const uniqueStatic2 = Array.from(static2Set).filter((s) => !static1Set.has(s));

          const commonDynamic = Array.from(dynamic1Set).filter((d) => dynamic2Set.has(d));
          const uniqueDynamic1 = Array.from(dynamic1Set).filter((d) => !dynamic2Set.has(d));
          const uniqueDynamic2 = Array.from(dynamic2Set).filter((d) => !dynamic1Set.has(d));

          return {
            user1: user1Id,
            user2: user2Id,
            commonStatic,
            uniqueStatic1,
            uniqueStatic2,
            commonDynamic,
            uniqueDynamic1,
            uniqueDynamic2,
          } as ProfileComparison;
        });

      const getProfileStats = (containerTag: string) =>
        Effect.gen(function* () {
          const response = yield* Effect.tryPromise({
            try: () =>
              fetch('https://api.supermemory.ai/v4/profile/stats', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  containerTag,
                }),
              }).then((res) => {
                if (!res.ok) {
                  throw new Error(`Failed to fetch profile stats: ${res.status}`);
                }
                return res.json();
              }),
            catch: (error) =>
              new SupermemoryError({
                message: `Failed to get profile stats: ${error}`,
              }),
          });

          return {
            container: containerTag,
            totalUsers: (response as any)?.totalUsers || 0,
            avgStaticFacts: (response as any)?.avgStaticFacts || 0,
            avgDynamicFacts: (response as any)?.avgDynamicFacts || 0,
            maxStaticFacts: (response as any)?.maxStaticFacts || 0,
            maxDynamicFacts: (response as any)?.maxDynamicFacts || 0,
            commonTopics: (response as any)?.commonTopics || {},
            retrievedAt: new Date().toISOString(),
          } as ProfileStats;
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
        getUserProfile,
        getUserProfileWithSearch,
        compareUserProfiles,
        getProfileStats,
      };
    });
