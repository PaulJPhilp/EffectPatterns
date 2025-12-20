/**
 * Job Repository
 *
 * Repository functions for Job (Jobs-to-be-Done) CRUD operations.
 */

import { eq, and, asc, sql, inArray } from "drizzle-orm"
import {
  jobs,
  patternJobs,
  effectPatterns,
  type Job,
  type NewJob,
  type JobStatus,
  type EffectPattern,
} from "../db/schema/index.js"
import type { Database } from "../db/client.js"

/**
 * Repository error types
 */
export class JobNotFoundError extends Error {
  readonly _tag = "JobNotFoundError"
  constructor(readonly identifier: string) {
    super(`Job not found: ${identifier}`)
  }
}

export class JobRepositoryError extends Error {
  readonly _tag = "JobRepositoryError"
  constructor(
    readonly operation: string,
    readonly cause: unknown
  ) {
    super(`Job repository error during ${operation}: ${String(cause)}`)
  }
}

/**
 * Job with related patterns
 */
export interface JobWithPatterns extends Job {
  patterns: EffectPattern[]
}

/**
 * Create job repository functions
 */
export function createJobRepository(db: Database) {
  return {
    /**
     * Find all jobs
     */
    async findAll(): Promise<Job[]> {
      return db.select().from(jobs).orderBy(asc(jobs.description))
    },

    /**
     * Find job by ID
     */
    async findById(id: string): Promise<Job | null> {
      const results = await db
        .select()
        .from(jobs)
        .where(eq(jobs.id, id))
        .limit(1)

      return results[0] ?? null
    },

    /**
     * Find job by slug
     */
    async findBySlug(slug: string): Promise<Job | null> {
      const results = await db
        .select()
        .from(jobs)
        .where(eq(jobs.slug, slug))
        .limit(1)

      return results[0] ?? null
    },

    /**
     * Find jobs by application pattern
     */
    async findByApplicationPattern(applicationPatternId: string): Promise<Job[]> {
      return db
        .select()
        .from(jobs)
        .where(eq(jobs.applicationPatternId, applicationPatternId))
        .orderBy(asc(jobs.category), asc(jobs.description))
    },

    /**
     * Find jobs by status
     */
    async findByStatus(status: JobStatus): Promise<Job[]> {
      return db
        .select()
        .from(jobs)
        .where(eq(jobs.status, status))
        .orderBy(asc(jobs.description))
    },

    /**
     * Find job with its fulfilling patterns
     */
    async findWithPatterns(id: string): Promise<JobWithPatterns | null> {
      // Get the job
      const jobResults = await db
        .select()
        .from(jobs)
        .where(eq(jobs.id, id))
        .limit(1)

      if (jobResults.length === 0) {
        return null
      }

      const job = jobResults[0]

      // Get related patterns
      const patternIds = await db
        .select({ patternId: patternJobs.patternId })
        .from(patternJobs)
        .where(eq(patternJobs.jobId, id))

      let patterns: EffectPattern[] = []
      if (patternIds.length > 0) {
        patterns = await db
          .select()
          .from(effectPatterns)
          .where(
            inArray(
              effectPatterns.id,
              patternIds.map((p) => p.patternId)
            )
          )
      }

      return {
        ...job,
        patterns,
      }
    },

    /**
     * Create a new job
     */
    async create(data: NewJob): Promise<Job> {
      const results = await db.insert(jobs).values(data).returning()
      return results[0]
    },

    /**
     * Update a job
     */
    async update(id: string, data: Partial<NewJob>): Promise<Job | null> {
      const results = await db
        .update(jobs)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(jobs.id, id))
        .returning()

      return results[0] ?? null
    },

    /**
     * Delete a job
     */
    async delete(id: string): Promise<boolean> {
      const results = await db
        .delete(jobs)
        .where(eq(jobs.id, id))
        .returning({ id: jobs.id })

      return results.length > 0
    },

    /**
     * Upsert a job by slug
     */
    async upsert(data: NewJob): Promise<Job> {
      const results = await db
        .insert(jobs)
        .values(data)
        .onConflictDoUpdate({
          target: jobs.slug,
          set: {
            description: data.description,
            category: data.category,
            status: data.status,
            applicationPatternId: data.applicationPatternId,
            updatedAt: new Date(),
          },
        })
        .returning()
      return results[0]
    },

    /**
     * Link a pattern to a job (fulfills relationship)
     */
    async linkPattern(jobId: string, patternId: string): Promise<void> {
      await db
        .insert(patternJobs)
        .values({ jobId, patternId })
        .onConflictDoNothing()
    },

    /**
     * Unlink a pattern from a job
     */
    async unlinkPattern(jobId: string, patternId: string): Promise<void> {
      await db
        .delete(patternJobs)
        .where(and(eq(patternJobs.jobId, jobId), eq(patternJobs.patternId, patternId)))
    },

    /**
     * Set all patterns for a job (replaces existing links)
     */
    async setPatterns(jobId: string, patternIds: string[]): Promise<void> {
      // Delete existing links
      await db.delete(patternJobs).where(eq(patternJobs.jobId, jobId))

      // Insert new links
      if (patternIds.length > 0) {
        await db.insert(patternJobs).values(
          patternIds.map((patternId) => ({
            jobId,
            patternId,
          }))
        )
      }
    },

    /**
     * Get coverage statistics
     */
    async getCoverageStats(): Promise<{
      total: number
      covered: number
      partial: number
      gap: number
    }> {
      const results = await db
        .select({
          status: jobs.status,
          count: sql<number>`count(*)::int`,
        })
        .from(jobs)
        .groupBy(jobs.status)

      const stats = {
        total: 0,
        covered: 0,
        partial: 0,
        gap: 0,
      }

      for (const row of results) {
        const statusKey = row.status as keyof typeof stats
        if (statusKey in stats && statusKey !== "total") {
          stats[statusKey] = row.count
          stats.total += row.count
        }
      }

      return stats
    },

    /**
     * Get coverage statistics by application pattern
     */
    async getCoverageByApplicationPattern(
      applicationPatternId: string
    ): Promise<{
      total: number
      covered: number
      partial: number
      gap: number
    }> {
      const results = await db
        .select({
          status: jobs.status,
          count: sql<number>`count(*)::int`,
        })
        .from(jobs)
        .where(eq(jobs.applicationPatternId, applicationPatternId))
        .groupBy(jobs.status)

      const stats = {
        total: 0,
        covered: 0,
        partial: 0,
        gap: 0,
      }

      for (const row of results) {
        const statusKey = row.status as keyof typeof stats
        if (statusKey in stats && statusKey !== "total") {
          stats[statusKey] = row.count
          stats.total += row.count
        }
      }

      return stats
    },
  }
}

export type JobRepository = ReturnType<typeof createJobRepository>
