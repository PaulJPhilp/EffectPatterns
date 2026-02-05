/**
 * Database Service Layer
 *
 * Effect.Service wrapper for database repositories providing
 * dependency injection and error handling.
 */

import { Config, Effect, Layer, Metric, Schedule } from "effect";
import { createDatabase, getDatabaseUrl } from "../db/client.js";
import type {
    ApplicationPattern,
    EffectPattern as DbEffectPattern,
    Job,
} from "../db/schema/index.js";
import type { JobWithPatterns } from "../repositories/index.js";
import {
    createApplicationPatternRepository,
    createEffectPatternRepository,
    createJobRepository,
    type ApplicationPatternRepository,
    type EffectPatternRepository,
    type JobRepository,
    type SearchPatternsParams,
} from "../repositories/index.js";
import type { Pattern } from "../schemas/pattern.js";
import { ToolkitConfig } from "./config.js";
import { ToolkitLogger } from "./logger.js";
import * as ToolkitMetrics from "./metrics.js";

/**
 * Convert database EffectPattern to legacy Pattern format
 */
export function dbPatternToLegacy(dbPattern: DbEffectPattern): Pattern {
  return {
    id: dbPattern.slug,
    slug: dbPattern.slug,
    title: dbPattern.title,
    description: dbPattern.summary,
    category: (dbPattern.category as Pattern["category"]) || "error-handling",
    difficulty:
      (dbPattern.skillLevel as Pattern["difficulty"]) || "intermediate",
    tags: (dbPattern.tags as string[]) || [],
    examples: (dbPattern.examples as Pattern["examples"]) || [],
    useCases: (dbPattern.useCases as string[]) || [],
    relatedPatterns: undefined,
    effectVersion: undefined,
    createdAt: dbPattern.createdAt?.toISOString(),
    updatedAt: dbPattern.updatedAt?.toISOString(),
  };
}

/**
 * Database connection service
 */
export class DatabaseService extends Effect.Service<DatabaseService>()(
  "DatabaseService",
  {
    effect: Effect.gen(function* () {
      const logger = yield* ToolkitLogger;
      const config = yield* ToolkitConfig;
      const maxConcurrent = yield* config.getMaxConcurrentDbRequests();
      
      // Initialize Bulkhead Semaphore
      const semaphore = yield* Effect.makeSemaphore(maxConcurrent);

      const databaseUrl = yield* Config.string("DATABASE_URL_OVERRIDE").pipe(
        Config.withDefault(getDatabaseUrl()),
      );

      yield* logger.debug("Initializing database connection", {
        url: databaseUrl.replace(/:[^:@]+@/, ":****@"), // Hide password
      });

      const connection = createDatabase(databaseUrl);

      yield* Effect.addFinalizer(() =>
        Effect.gen(function* () {
          yield* logger.debug("Closing database connection");
          yield* Effect.tryPromise({
            try: () => connection.close(),
            catch: (error) =>
              new Error(
                `Failed to close database connection: ${String(error)}`,
              ),
          }).pipe(Effect.ignore);
        }),
      );

      return {
        db: connection.db,
        close: connection.close,
        semaphore,

      };
    }),
    dependencies: [ToolkitLogger.Default, ToolkitConfig.Default],
  },
) {}

/**
 * Database layer with all services
 */
export const DatabaseServiceLive = DatabaseService.Default.pipe(
  Layer.provide(ToolkitLogger.Default),
  Layer.provide(ToolkitConfig.Default),
);

/**
 * Application Pattern Repository Service
 */
export class ApplicationPatternRepositoryService extends Effect.Service<ApplicationPatternRepositoryService>()(
  "ApplicationPatternRepositoryService",
  {
    effect: Effect.gen(function* () {
      const dbService = yield* DatabaseService;
      return createApplicationPatternRepository(dbService.db);
    }),
    dependencies: [DatabaseService.Default],
  },
) {}

/**
 * Effect Pattern Repository Service
 */
export class EffectPatternRepositoryService extends Effect.Service<EffectPatternRepositoryService>()(
  "EffectPatternRepositoryService",
  {
    effect: Effect.gen(function* () {
      const dbService = yield* DatabaseService;
      return createEffectPatternRepository(dbService.db);
    }),
    dependencies: [DatabaseService.Default],
  },
) {}

/**
 * Job Repository Service
 */
export class JobRepositoryService extends Effect.Service<JobRepositoryService>()(
  "JobRepositoryService",
  {
    effect: Effect.gen(function* () {
      const dbService = yield* DatabaseService;
      return createJobRepository(dbService.db);
    }),
    dependencies: [DatabaseService.Default],
  },
) {}

export const ApplicationPatternRepositoryLive =
  ApplicationPatternRepositoryService.Default.pipe(
    Layer.provide(DatabaseServiceLive),
  );

export const EffectPatternRepositoryLive =
  EffectPatternRepositoryService.Default.pipe(
    Layer.provide(DatabaseServiceLive),
  );

export const JobRepositoryLive = JobRepositoryService.Default.pipe(
  Layer.provide(DatabaseServiceLive),
);

/**
 * Complete database layer with all repositories
 */
export const DatabaseLayer = Layer.mergeAll(
  DatabaseServiceLive,
  ApplicationPatternRepositoryLive,
  EffectPatternRepositoryLive,
  JobRepositoryLive,
);

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
> =>
  Effect.gen(function* () {
    return yield* ApplicationPatternRepositoryService;
  });

/**
 * Get effect pattern repository
 */
export const getEffectPatternRepository = (): Effect.Effect<
  EffectPatternRepository,
  never,
  EffectPatternRepositoryService
> =>
  Effect.gen(function* () {
    return yield* EffectPatternRepositoryService;
  });

/**
 * Get job repository
 */
export const getJobRepository = (): Effect.Effect<
  JobRepository,
  never,
  JobRepositoryService
> =>
  Effect.gen(function* () {
    return yield* JobRepositoryService;
  });

/**
 * Resilient Operation Helper
 * Applies Bulkhead, Retry, and Fallback patterns
 */
const resilient = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  fallbackValue: A
): Effect.Effect<A, E, R | DatabaseService | ToolkitConfig | ToolkitLogger> =>
  Effect.gen(function* () {
    const dbService = yield* DatabaseService;
    const config = yield* ToolkitConfig;
    const logger = yield* ToolkitLogger;

    const retryAttempts = yield* config.getDbRetryAttempts();
    const retryDelay = yield* config.getDbRetryDelayMs();

    // Define retry policy with exponential backoff
    const retryPolicy = Schedule.exponential(retryDelay).pipe(
      Schedule.intersect(Schedule.recurs(retryAttempts))
    );

    const trackedEffect = effect.pipe(
      Effect.tap(() => Metric.increment(ToolkitMetrics.dbBulkheadActive)),
      // Bulkhead: Limit concurrent execution
      dbService.semaphore.withPermits(1),
      Effect.tap(() => Metric.incrementBy(ToolkitMetrics.dbBulkheadActive, -1)),
      
      Effect.tapError(() => Metric.update(ToolkitMetrics.dbRequests.pipe(Metric.tagged("status", "failure")), 1)),
      Effect.tap(() => Metric.update(ToolkitMetrics.dbRequests.pipe(Metric.tagged("status", "success")), 1)),
      // Track Duration manually
      (eff) => Effect.gen(function*() {
          const start = Date.now();
          const result = yield* Effect.exit(eff);
          const duration = (Date.now() - start) / 1000;
          yield* Metric.update(ToolkitMetrics.dbRequestDuration, duration);
          return yield* result;
      }),

      // Retry: Exponential backoff for transient failures
      Effect.retry({
        schedule: retryPolicy,
        while: (error) => {
          // Log retry attempt
          Effect.runSync(
            logger.warn("Retrying DB operation due to error", { error })
          );
          return true; // Always retry for now, could be refined based on error type
        }
      }),
      
      // Fallback: Safe default on ultimate failure
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* logger.error("DB operation failed after retries, using fallback", { error });
          yield* Metric.update(ToolkitMetrics.dbRequests.pipe(Metric.tagged("status", "fallback")), 1);
          return fallbackValue;
        })
      )
    );

    return yield* trackedEffect;
  });

// ============================================
// High-Level Operations
// ============================================

/**
 * Find all application patterns
 */
export const findAllApplicationPatterns = (): Effect.Effect<
  ApplicationPattern[],
  Error,
  ApplicationPatternRepositoryService | DatabaseService | ToolkitConfig | ToolkitLogger
> =>
  Effect.gen(function* () {
    const repo = yield* ApplicationPatternRepositoryService;
    const operation = Effect.tryPromise({
      try: () => repo.findAll(),
      catch: (error) =>
        new Error(`Failed to load application patterns: ${String(error)}`),
    }).pipe(
      Effect.timeout(15000) // 15 second timeout for batch operations
    );
    return yield* resilient(operation, []);
  });

/**
 * Find application pattern by slug
 */
export const findApplicationPatternBySlug = (
  slug: string,
): Effect.Effect<
  ApplicationPattern | null,
  Error,
  ApplicationPatternRepositoryService | DatabaseService | ToolkitConfig | ToolkitLogger
> =>
  Effect.gen(function* () {
    const repo = yield* ApplicationPatternRepositoryService;
    const operation = Effect.tryPromise({
      try: () => repo.findBySlug(slug),
      catch: (error) =>
        new Error(`Failed to find application pattern: ${String(error)}`),
    }).pipe(
      Effect.timeout(10000) // 10 second timeout for single pattern lookups
    );
    
    return yield* resilient(operation, null);
  });

/**
 * Search effect patterns
 */
export const searchEffectPatterns = (
  params: SearchPatternsParams,
): Effect.Effect<Pattern[], Error, EffectPatternRepositoryService | DatabaseService | ToolkitConfig | ToolkitLogger> =>
  Effect.gen(function* () {
    const repo = yield* EffectPatternRepositoryService;
    const operation = Effect.tryPromise({
      try: () => repo.search(params),
      catch: (error) =>
        new Error(`Failed to search patterns: ${String(error)}`),
    }).pipe(
      Effect.timeout(15000), // 15 second timeout for search operations
      Effect.map(patterns => patterns.map(dbPatternToLegacy))
    );
    
    return yield* resilient(operation, []);
  });

/**
 * Find effect pattern by slug
 */
export const findEffectPatternBySlug = (
  slug: string,
): Effect.Effect<Pattern | null, Error, EffectPatternRepositoryService | DatabaseService | ToolkitConfig | ToolkitLogger> =>
  Effect.gen(function* () {
    const repo = yield* EffectPatternRepositoryService;
    const operation = Effect.tryPromise({
      try: () => repo.findBySlug(slug),
      catch: (error) => new Error(`Failed to find pattern: ${String(error)}`),
    }).pipe(
      Effect.timeout(10000), // 10 second timeout for single pattern lookups
      Effect.map(p => p ? dbPatternToLegacy(p) : null)
    );
    
    return yield* resilient(operation, null);
  });

/**
 * Find patterns by application pattern
 */
export const findPatternsByApplicationPattern = (
  applicationPatternId: string,
): Effect.Effect<Pattern[], Error, EffectPatternRepositoryService | DatabaseService | ToolkitConfig | ToolkitLogger> =>
  Effect.gen(function* () {
    const repo = yield* EffectPatternRepositoryService;
    const operation = Effect.tryPromise({
      try: () => repo.findByApplicationPattern(applicationPatternId),
      catch: (error) => new Error(`Failed to find patterns: ${String(error)}`),
    }).pipe(
      Effect.map(patterns => patterns.map(dbPatternToLegacy))
    );
    
    return yield* resilient(operation, []);
  });

/**
 * Find jobs by application pattern
 */
export const findJobsByApplicationPattern = (
  applicationPatternId: string,
): Effect.Effect<Job[], Error, JobRepositoryService | DatabaseService | ToolkitConfig | ToolkitLogger> =>
  Effect.gen(function* () {
    const repo = yield* JobRepositoryService;
    const operation = Effect.tryPromise({
      try: () => repo.findByApplicationPattern(applicationPatternId),
      catch: (error) => new Error(`Failed to find jobs: ${String(error)}`),
    });
    
    return yield* resilient(operation, []);
  });

/**
 * Get job with patterns
 */
export const getJobWithPatterns = (
  jobId: string,
): Effect.Effect<JobWithPatterns | null, Error, JobRepositoryService | DatabaseService | ToolkitConfig | ToolkitLogger> =>
  Effect.gen(function* () {
    const repo = yield* JobRepositoryService;
    const operation = Effect.tryPromise({
      try: () => repo.findWithPatterns(jobId),
      catch: (error) =>
        new Error(`Failed to get job with patterns: ${String(error)}`),
    });
    
    return yield* resilient(operation, null);
  });

/**
 * Get coverage statistics
 */
export const getCoverageStats = (): Effect.Effect<
  { total: number; covered: number; partial: number; gap: number },
  Error,
  JobRepositoryService | DatabaseService | ToolkitConfig | ToolkitLogger
> =>
  Effect.gen(function* () {
    const repo = yield* JobRepositoryService;
    const operation = Effect.tryPromise({
      try: () => repo.getCoverageStats(),
      catch: (error) =>
        new Error(`Failed to get coverage stats: ${String(error)}`),
    });
    
    return yield* resilient(operation, { total: 0, covered: 0, partial: 0, gap: 0 });
  });
