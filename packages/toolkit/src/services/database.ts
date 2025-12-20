/**
 * Database Service Layer
 *
 * Effect.Service wrapper for database repositories providing
 * dependency injection and error handling.
 */

import { Effect, Layer, Config } from "effect"
import { createDatabase, getDatabaseUrl, type Database } from "../db/client.js"
import {
  createApplicationPatternRepository,
  createEffectPatternRepository,
  createJobRepository,
  type ApplicationPatternRepository,
  type EffectPatternRepository,
  type JobRepository,
  type SearchPatternsParams,
} from "../repositories/index.js"
import type {
  ApplicationPattern,
  NewApplicationPattern,
  EffectPattern as DbEffectPattern,
  NewEffectPattern,
  Job,
  NewJob,
  JobWithPatterns,
  SkillLevel,
  JobStatus,
} from "../db/schema/index.js"
import type { Pattern } from "../schemas/pattern.js"
import { ToolkitLogger, ToolkitLoggerLive } from "./logger.js"
import { ToolkitConfig, ToolkitConfigLive } from "./config.js"

/**
 * Convert database EffectPattern to legacy Pattern format
 */
function dbPatternToLegacy(dbPattern: DbEffectPattern): Pattern {
  return {
    id: dbPattern.slug,
    title: dbPattern.title,
    description: dbPattern.summary,
    category: (dbPattern.category as Pattern["category"]) || "error-handling",
    difficulty: (dbPattern.skillLevel as Pattern["difficulty"]) || "intermediate",
    tags: (dbPattern.tags as string[]) || [],
    examples: (dbPattern.examples as Pattern["examples"]) || [],
    useCases: (dbPattern.useCases as string[]) || [],
    relatedPatterns: undefined,
    effectVersion: undefined,
    createdAt: dbPattern.createdAt?.toISOString(),
    updatedAt: dbPattern.updatedAt?.toISOString(),
  }
}

/**
 * Database connection service
 */
export class DatabaseService extends Effect.Service<DatabaseService>()(
  "DatabaseService",
  {
    effect: Effect.gen(function* () {
      const logger = yield* ToolkitLogger
      const databaseUrl = yield* Config.string("DATABASE_URL").pipe(
        Config.withDefault(getDatabaseUrl())
      )

      yield* logger.debug("Initializing database connection", {
        url: databaseUrl.replace(/:[^:@]+@/, ":****@"), // Hide password
      })

      const connection = createDatabase(databaseUrl)

      yield* Effect.addFinalizer(() =>
        Effect.gen(function* () {
          yield* logger.debug("Closing database connection")
          await connection.close()
        })
      )

      return {
        db: connection.db,
        close: connection.close,
      }
    }),
    dependencies: [ToolkitLoggerLive, ToolkitConfigLive],
  }
) {}

/**
 * Application Pattern Repository Service
 */
export class ApplicationPatternRepositoryService extends Effect.Service<ApplicationPatternRepositoryService>()(
  "ApplicationPatternRepositoryService",
  {
    effect: Effect.gen(function* () {
      const { db } = yield* DatabaseService
      return createApplicationPatternRepository(db)
    }),
    dependencies: [DatabaseService.Default],
  }
) {}

/**
 * Effect Pattern Repository Service
 */
export class EffectPatternRepositoryService extends Effect.Service<EffectPatternRepositoryService>()(
  "EffectPatternRepositoryService",
  {
    effect: Effect.gen(function* () {
      const { db } = yield* DatabaseService
      return createEffectPatternRepository(db)
    }),
    dependencies: [DatabaseService.Default],
  }
) {}

/**
 * Job Repository Service
 */
export class JobRepositoryService extends Effect.Service<JobRepositoryService>()(
  "JobRepositoryService",
  {
    effect: Effect.gen(function* () {
      const { db } = yield* DatabaseService
      return createJobRepository(db)
    }),
    dependencies: [DatabaseService.Default],
  }
) {}

/**
 * Database layer with all services
 */
export const DatabaseServiceLive = Layer.effect(
  DatabaseService,
  DatabaseService.effect
).pipe(Layer.provide(ToolkitLoggerLive), Layer.provide(ToolkitConfigLive))

export const ApplicationPatternRepositoryLive = Layer.effect(
  ApplicationPatternRepositoryService,
  ApplicationPatternRepositoryService.effect
).pipe(Layer.provide(DatabaseServiceLive))

export const EffectPatternRepositoryLive = Layer.effect(
  EffectPatternRepositoryService,
  EffectPatternRepositoryService.effect
).pipe(Layer.provide(DatabaseServiceLive))

export const JobRepositoryLive = Layer.effect(
  JobRepositoryService,
  JobRepositoryService.effect
).pipe(Layer.provide(DatabaseServiceLive))

/**
 * Complete database layer with all repositories
 */
export const DatabaseLayer = Layer.mergeAll(
  DatabaseServiceLive,
  ApplicationPatternRepositoryLive,
  EffectPatternRepositoryLive,
  JobRepositoryLive
)

// ============================================
// Convenience Functions
// ============================================

/**
 * Get application pattern repository
 */
export const getApplicationPatternRepository = (): Effect.Effect<
  ApplicationPatternRepository,
  never,
  ApplicationPatternRepositoryService
> => Effect.gen(function* () {
  return yield* ApplicationPatternRepositoryService
})

/**
 * Get effect pattern repository
 */
export const getEffectPatternRepository = (): Effect.Effect<
  EffectPatternRepository,
  never,
  EffectPatternRepositoryService
> => Effect.gen(function* () {
  return yield* EffectPatternRepositoryService
})

/**
 * Get job repository
 */
export const getJobRepository = (): Effect.Effect<
  JobRepository,
  never,
  JobRepositoryService
> => Effect.gen(function* () {
  return yield* JobRepositoryService
})

// ============================================
// High-Level Operations
// ============================================

/**
 * Find all application patterns
 */
export const findAllApplicationPatterns = (): Effect.Effect<
  ApplicationPattern[],
  Error,
  ApplicationPatternRepositoryService
> =>
  Effect.gen(function* () {
    const repo = yield* ApplicationPatternRepositoryService
    return yield* Effect.tryPromise({
      try: () => repo.findAll(),
      catch: (error) => new Error(`Failed to load application patterns: ${String(error)}`),
    })
  })

/**
 * Find application pattern by slug
 */
export const findApplicationPatternBySlug = (
  slug: string
): Effect.Effect<
  ApplicationPattern | null,
  Error,
  ApplicationPatternRepositoryService
> =>
  Effect.gen(function* () {
    const repo = yield* ApplicationPatternRepositoryService
    return yield* Effect.tryPromise({
      try: () => repo.findBySlug(slug),
      catch: (error) => new Error(`Failed to find application pattern: ${String(error)}`),
    })
  })

/**
 * Search effect patterns
 */
export const searchEffectPatterns = (
  params: SearchPatternsParams
): Effect.Effect<
  Pattern[],
  Error,
  EffectPatternRepositoryService
> =>
  Effect.gen(function* () {
    const repo = yield* EffectPatternRepositoryService
    const dbPatterns = yield* Effect.tryPromise({
      try: () => repo.search(params),
      catch: (error) => new Error(`Failed to search patterns: ${String(error)}`),
    })
    return dbPatterns.map(dbPatternToLegacy)
  })

/**
 * Find effect pattern by slug
 */
export const findEffectPatternBySlug = (
  slug: string
): Effect.Effect<
  Pattern | null,
  Error,
  EffectPatternRepositoryService
> =>
  Effect.gen(function* () {
    const repo = yield* EffectPatternRepositoryService
    const dbPattern = yield* Effect.tryPromise({
      try: () => repo.findBySlug(slug),
      catch: (error) => new Error(`Failed to find pattern: ${String(error)}`),
    })
    return dbPattern ? dbPatternToLegacy(dbPattern) : null
  })

/**
 * Find patterns by application pattern
 */
export const findPatternsByApplicationPattern = (
  applicationPatternId: string
): Effect.Effect<
  Pattern[],
  Error,
  EffectPatternRepositoryService
> =>
  Effect.gen(function* () {
    const repo = yield* EffectPatternRepositoryService
    const dbPatterns = yield* Effect.tryPromise({
      try: () => repo.findByApplicationPattern(applicationPatternId),
      catch: (error) => new Error(`Failed to find patterns: ${String(error)}`),
    })
    return dbPatterns.map(dbPatternToLegacy)
  })

/**
 * Find jobs by application pattern
 */
export const findJobsByApplicationPattern = (
  applicationPatternId: string
): Effect.Effect<
  Job[],
  Error,
  JobRepositoryService
> =>
  Effect.gen(function* () {
    const repo = yield* JobRepositoryService
    return yield* Effect.tryPromise({
      try: () => repo.findByApplicationPattern(applicationPatternId),
      catch: (error) => new Error(`Failed to find jobs: ${String(error)}`),
    })
  })

/**
 * Get job with patterns
 */
export const getJobWithPatterns = (
  jobId: string
): Effect.Effect<
  JobWithPatterns | null,
  Error,
  JobRepositoryService
> =>
  Effect.gen(function* () {
    const repo = yield* JobRepositoryService
    return yield* Effect.tryPromise({
      try: () => repo.findWithPatterns(jobId),
      catch: (error) => new Error(`Failed to get job with patterns: ${String(error)}`),
    })
  })

/**
 * Get coverage statistics
 */
export const getCoverageStats = (): Effect.Effect<
  { total: number; covered: number; partial: number; gap: number },
  Error,
  JobRepositoryService
> =>
  Effect.gen(function* () {
    const repo = yield* JobRepositoryService
    return yield* Effect.tryPromise({
      try: () => repo.getCoverageStats(),
      catch: (error) => new Error(`Failed to get coverage stats: ${String(error)}`),
    })
  })

