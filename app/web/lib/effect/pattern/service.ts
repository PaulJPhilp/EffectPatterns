/**
 * PatternRepository implementation using Drizzle ORM
 */

import { and, arrayContains, asc, eq, ilike, or, sql } from "drizzle-orm";
import { Effect } from "effect";
import { db } from "../../db/client.js";
import { patternModulePlacements, patterns } from "../../db/schema.js";
import type { PatternRepository } from "./api.js";
import { PatternNotFound, PatternQueryError } from "./errors.js";
import type {
  DbPatternRow,
  PageParams,
  PatternFilter,
  PatternID,
} from "./types.js";
import { toPatternMeta } from "./utils.js";

/**
 * Default pagination limits
 */
const DEFAULT_LIMIT = 50;
const DEFAULT_OFFSET = 0;

/**
 * PatternRepository service implementation
 */
export class PatternRepositoryService extends Effect.Service<PatternRepositoryService>()(
  "PatternRepositoryService",
  {
    sync: () => ({
      findById: (id: PatternID) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () => db.select().from(patterns).where(eq(patterns.id, id)),
            catch: (cause) =>
              new PatternQueryError({
                message: `Failed to query pattern by id: ${id}`,
                cause,
              }),
          });

          if (result.length === 0) {
            return yield* Effect.fail(new PatternNotFound({ id }));
          }

          return toPatternMeta(result[0] as unknown as DbPatternRow);
        }),

      findAll: (params?: PageParams) =>
        Effect.gen(function* () {
          const limit = params?.limit ?? DEFAULT_LIMIT;
          const offset = params?.offset ?? DEFAULT_OFFSET;

          // Get total count
          const countResult = yield* Effect.tryPromise({
            try: () =>
              db
                .select({ count: sql<number>`count(*)` })
                .from(patterns)
                .then((rows) => rows[0]?.count ?? 0),
            catch: (cause) =>
              new PatternQueryError({
                message: "Failed to count patterns",
                cause,
              }),
          });

          // Get paginated results
          const items = yield* Effect.tryPromise({
            try: () =>
              db
                .select()
                .from(patterns)
                .limit(limit)
                .offset(offset)
                .orderBy(asc(patterns.title)),
            catch: (cause) =>
              new PatternQueryError({
                message: "Failed to query patterns",
                cause,
              }),
          });

          return {
            items: items.map((row) =>
              toPatternMeta(row as unknown as DbPatternRow)
            ),
            total: countResult,
            limit,
            offset,
          };
        }),

      findByTag: (tag: string, params?: PageParams) =>
        Effect.gen(function* () {
          const limit = params?.limit ?? DEFAULT_LIMIT;
          const offset = params?.offset ?? DEFAULT_OFFSET;

          // Get total count
          const countResult = yield* Effect.tryPromise({
            try: () =>
              db
                .select({ count: sql<number>`count(*)` })
                .from(patterns)
                .where(arrayContains(patterns.tags, [tag]))
                .then((rows) => rows[0]?.count ?? 0),
            catch: (cause) =>
              new PatternQueryError({
                message: `Failed to count patterns by tag: ${tag}`,
                cause,
              }),
          });

          // Get paginated results
          const items = yield* Effect.tryPromise({
            try: () =>
              db
                .select()
                .from(patterns)
                .where(arrayContains(patterns.tags, [tag]))
                .limit(limit)
                .offset(offset)
                .orderBy(asc(patterns.title)),
            catch: (cause) =>
              new PatternQueryError({
                message: `Failed to query patterns by tag: ${tag}`,
                cause,
              }),
          });

          return {
            items: items.map((row) =>
              toPatternMeta(row as unknown as DbPatternRow)
            ),
            total: countResult,
            limit,
            offset,
          };
        }),

      search: (filter: PatternFilter, params?: PageParams) =>
        Effect.gen(function* () {
          const limit = params?.limit ?? DEFAULT_LIMIT;
          const offset = params?.offset ?? DEFAULT_OFFSET;

          // Build WHERE conditions
          const conditions = [];

          if (filter.query) {
            conditions.push(
              or(
                ilike(patterns.title, `%${filter.query}%`),
                ilike(patterns.summary, `%${filter.query}%`)
              )
            );
          }

          if (filter.skillLevel) {
            conditions.push(eq(patterns.skillLevel, filter.skillLevel));
          }

          if (filter.tags && filter.tags.length > 0) {
            conditions.push(arrayContains(patterns.tags, filter.tags));
          }

          const whereClause =
            conditions.length > 0 ? and(...conditions) : undefined;

          // Get total count
          const countResult = yield* Effect.tryPromise({
            try: () =>
              db
                .select({ count: sql<number>`count(*)` })
                .from(patterns)
                .where(whereClause)
                .then((rows) => rows[0]?.count ?? 0),
            catch: (cause) =>
              new PatternQueryError({
                message: "Failed to count search results",
                cause,
              }),
          });

          // Get paginated results
          const items = yield* Effect.tryPromise({
            try: () =>
              db
                .select()
                .from(patterns)
                .where(whereClause)
                .limit(limit)
                .offset(offset)
                .orderBy(asc(patterns.title)),
            catch: (cause) =>
              new PatternQueryError({
                message: "Failed to search patterns",
                cause,
              }),
          });

          return {
            items: items.map((row) =>
              toPatternMeta(row as unknown as DbPatternRow)
            ),
            total: countResult,
            limit,
            offset,
          };
        }),

      listByModule: (moduleId: string, stage?: number) =>
        Effect.gen(function* () {
          const whereConditions = [
            eq(patternModulePlacements.moduleId, moduleId as any),
          ];

          if (stage !== undefined) {
            whereConditions.push(eq(patternModulePlacements.stage, stage));
          }

          const results = yield* Effect.tryPromise({
            try: () =>
              db
                .select({
                  pattern: patterns,
                  placement: patternModulePlacements,
                })
                .from(patternModulePlacements)
                .innerJoin(
                  patterns,
                  eq(patternModulePlacements.patternId, patterns.id)
                )
                .where(and(...whereConditions))
                .orderBy(
                  sql`${patternModulePlacements.stage} ASC NULLS LAST`,
                  asc(patternModulePlacements.position)
                ),
            catch: (cause) =>
              new PatternQueryError({
                message: `Failed to list patterns by module: ${moduleId}`,
                cause,
              }),
          });

          return results.map((row) =>
            toPatternMeta(row.pattern as unknown as DbPatternRow)
          );
        }),
    }),
  }
) {}
