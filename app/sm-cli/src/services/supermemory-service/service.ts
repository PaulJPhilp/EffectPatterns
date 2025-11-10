import { Effect } from "effect";
import Supermemory from "supermemory";
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
import type { SupermemoryServiceAPI } from "./api.js";
import {
  ApiKeyError,
  DocumentError,
  MemoryError,
  ProfileError,
  SearchError,
  TimeoutError,
} from "./errors.js";
import { buildAuthHeaders, getApiUrl, validateApiKey } from "./helpers.js";

/**
 * SupermemoryService Implementation
 * Manages all Supermemory API interactions via Effect.Service pattern
 */

export function makeSupermemoryService(
  apiKey: string
): Effect.Effect<SupermemoryServiceAPI, ApiKeyError> {
  return Effect.gen(function* () {
    yield* validateApiKey(apiKey);

    const client = new Supermemory({ apiKey });

    const listMemories = (page: number, limit: number) =>
      Effect.tryPromise({
        try: () =>
          (client.memories as any).list({
            page,
            limit,
          }),
        catch: (error) =>
          new MemoryError({
            operation: "listMemories",
            cause: error,
          }),
      }).pipe(Effect.map((response) => (response as any)?.memories ?? []));

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
            ? memories.filter(
                (m: Memory) =>
                  (m as any)?.type === type ||
                  (m.metadata as any)?.type === type
              )
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
      Effect.tryPromise({
        try: () =>
          (client.memories as any).add({
            content,
            metadata: metadata as any,
          }),
        catch: (error) =>
          new MemoryError({
            operation: "addMemory",
            cause: error,
          }),
      }).pipe(
        Effect.flatMap((result) => {
          if (!(result as any)?.id) {
            return Effect.fail(
              new MemoryError({
                operation: "addMemory",
                cause: new Error("No ID returned from Supermemory API"),
              })
            );
          }
          return Effect.succeed((result as any).id as string);
        })
      );

    const searchMemories = (query: string, limit: number) =>
      Effect.tryPromise({
        try: () =>
          (client.search as any).memories({
            q: query,
            limit,
          }),
        catch: (error) =>
          new SearchError({
            query,
            cause: error,
          }),
      }).pipe(Effect.map((results) => (results as any)?.results ?? []));

    const getProcessingQueue = () =>
      Effect.tryPromise({
        try: () =>
          fetch(getApiUrl("/v3/documents/processing"), {
            method: "GET",
            headers: buildAuthHeaders(apiKey),
          }).then((res) => {
            if (!res.ok) {
              throw new Error(
                `Failed to fetch processing queue: ${res.status}`
              );
            }
            return res.json();
          }),
        catch: (error) =>
          new DocumentError({
            documentId: "queue",
            operation: "getProcessingQueue",
            cause: error,
          }),
      }).pipe(Effect.map((response) => response as ProcessingQueue));

    const getDocumentStatus = (id: string) =>
      Effect.tryPromise({
        try: () =>
          fetch(getApiUrl(`/v3/documents/${id}`), {
            method: "GET",
            headers: buildAuthHeaders(apiKey),
          }).then((res) => {
            if (!res.ok) {
              throw new Error(`Failed to fetch document: ${res.status}`);
            }
            return res.json();
          }),
        catch: (error) =>
          new DocumentError({
            documentId: id,
            operation: "getDocumentStatus",
            cause: error,
          }),
      }).pipe(Effect.map((response) => response as ProcessingDocument));

    const deleteDocument = (id: string) =>
      Effect.tryPromise({
        try: () =>
          fetch(getApiUrl(`/v3/documents/${id}`), {
            method: "DELETE",
            headers: buildAuthHeaders(apiKey),
          }).then((res) => {
            if (!res.ok) {
              throw new Error(`Failed to delete document: ${res.status}`);
            }
          }),
        catch: (error) =>
          new DocumentError({
            documentId: id,
            operation: "deleteDocument",
            cause: error,
          }),
      }).pipe(Effect.map(() => undefined as void));

    const pollDocumentStatus = (id: string, maxWaitMs = 300000) =>
      Effect.gen(function* () {
        const startTime = Date.now();
        const pollInterval = 2000;

        while (Date.now() - startTime < maxWaitMs) {
          const doc = yield* getDocumentStatus(id);

          if (doc.status === "done" || doc.status === "failed") {
            return doc;
          }

          yield* Effect.sleep("2 seconds");
        }

        return yield* Effect.fail(
          new TimeoutError({
            documentId: id,
            timeoutMs: maxWaitMs,
          })
        );
      });

    const getUserProfile = (userId: string) =>
      Effect.tryPromise({
        try: () =>
          fetch(getApiUrl("/v4/profile"), {
            method: "POST",
            headers: buildAuthHeaders(apiKey),
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
          new ProfileError({
            userId,
            cause: error,
          }),
      }).pipe(
        Effect.flatMap((response) => {
          if (!(response as any)?.profile) {
            return Effect.fail(
              new ProfileError({
                userId,
                cause: new Error("No profile data returned"),
              })
            );
          }

          const profile = (response as any).profile;
          return Effect.succeed({
            userId,
            static: profile.static || [],
            dynamic: profile.dynamic || [],
            retrievedAt: new Date().toISOString(),
          } as UserProfile);
        })
      );

    const getUserProfileWithSearch = (userId: string, query: string) =>
      Effect.tryPromise({
        try: () =>
          fetch(getApiUrl("/v4/profile"), {
            method: "POST",
            headers: buildAuthHeaders(apiKey),
            body: JSON.stringify({
              containerTag: userId,
              q: query,
            }),
          }).then((res) => {
            if (!res.ok) {
              throw new Error(
                `Failed to fetch profile with search: ${res.status}`
              );
            }
            return res.json();
          }),
        catch: (error) =>
          new ProfileError({
            userId,
            cause: error,
          }),
      }).pipe(
        Effect.flatMap((response) => {
          if (!(response as any)?.profile) {
            return Effect.fail(
              new ProfileError({
                userId,
                cause: new Error("No profile data returned"),
              })
            );
          }

          const profile = (response as any).profile;
          const searchResults = (response as any).searchResults || {};

          return Effect.succeed({
            profile: {
              userId,
              static: profile.static || [],
              dynamic: profile.dynamic || [],
              retrievedAt: new Date().toISOString(),
            },
            searchResults: (searchResults.results || []) as any[],
            searchQuery: query,
            searchTiming: searchResults.timing || 0,
          } as UserProfileWithSearch);
        })
      );

    const compareUserProfiles = (user1Id: string, user2Id: string) =>
      Effect.gen(function* () {
        const profile1 = yield* getUserProfile(user1Id);
        const profile2 = yield* getUserProfile(user2Id);

        const static1Set = new Set(profile1.static);
        const static2Set = new Set(profile2.static);
        const dynamic1Set = new Set(profile1.dynamic);
        const dynamic2Set = new Set(profile2.dynamic);

        const commonStatic = Array.from(static1Set).filter((s) =>
          static2Set.has(s)
        );
        const uniqueStatic1 = Array.from(static1Set).filter(
          (s) => !static2Set.has(s)
        );
        const uniqueStatic2 = Array.from(static2Set).filter(
          (s) => !static1Set.has(s)
        );

        const commonDynamic = Array.from(dynamic1Set).filter((d) =>
          dynamic2Set.has(d)
        );
        const uniqueDynamic1 = Array.from(dynamic1Set).filter(
          (d) => !dynamic2Set.has(d)
        );
        const uniqueDynamic2 = Array.from(dynamic2Set).filter(
          (d) => !dynamic1Set.has(d)
        );

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
      Effect.tryPromise({
        try: () =>
          fetch(getApiUrl("/v4/profile/stats"), {
            method: "POST",
            headers: buildAuthHeaders(apiKey),
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
          new ProfileError({
            userId: containerTag,
            cause: error,
          }),
      }).pipe(
        Effect.map(
          (response) =>
            ({
              container: containerTag,
              totalUsers: (response as any)?.totalUsers || 0,
              avgStaticFacts: (response as any)?.avgStaticFacts || 0,
              avgDynamicFacts: (response as any)?.avgDynamicFacts || 0,
              maxStaticFacts: (response as any)?.maxStaticFacts || 0,
              maxDynamicFacts: (response as any)?.maxDynamicFacts || 0,
              commonTopics: (response as any)?.commonTopics || {},
              retrievedAt: new Date().toISOString(),
            } as ProfileStats)
        )
      );

    const searchDocuments = (options: DocumentSearchOptions) =>
      Effect.tryPromise({
        try: () =>
          fetch(getApiUrl("/v3/search"), {
            method: "POST",
            headers: buildAuthHeaders(apiKey),
            body: JSON.stringify(options),
          }).then((res) => {
            if (!res.ok) {
              throw new Error(`Failed to search documents: ${res.status}`);
            }
            return res.json();
          }),
        catch: (error) =>
          new SearchError({
            query: (options as any)?.q || "",
            cause: error,
          }),
      }).pipe(Effect.map((response) => response as DocumentSearchResult));

    const searchMemoriesAdvanced = (options: MemorySearchOptions) =>
      Effect.tryPromise({
        try: () =>
          fetch(getApiUrl("/v4/search"), {
            method: "POST",
            headers: buildAuthHeaders(apiKey),
            body: JSON.stringify(options),
          }).then((res) => {
            if (!res.ok) {
              throw new Error(`Failed to search memories: ${res.status}`);
            }
            return res.json();
          }),
        catch: (error) =>
          new SearchError({
            query: (options as any)?.q || "",
            cause: error,
          }),
      }).pipe(Effect.map((response) => response as MemorySearchResult));

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
      searchDocuments,
      searchMemoriesAdvanced,
    } satisfies SupermemoryServiceAPI;
  });
}

/**
 * SupermemoryService Effect.Service implementation
 */
export class SupermemoryService extends Effect.Service<SupermemoryService>()(
  "SupermemoryService",
  {
    scoped: () =>
      Effect.gen(function* () {
        const apiKey = process.env.SUPERMEMORY_API_KEY;
        return yield* makeSupermemoryService(apiKey || "");
      }),
  }
) {}
