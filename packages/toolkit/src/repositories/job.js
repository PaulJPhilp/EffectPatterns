/**
 * Job Repository
 *
 * Repository functions for Job (Jobs-to-be-Done) CRUD operations.
 */
import { eq, and, asc, sql, inArray } from "drizzle-orm";
import { jobs, patternJobs, effectPatterns, } from "../db/schema/index.js";
/**
 * Check if a job is locked (validated)
 */
function isLocked(job) {
    return job.validated === true;
}
/**
 * Repository error types
 */
export class JobNotFoundError extends Error {
    constructor(identifier) {
        super(`Job not found: ${identifier}`);
        this.identifier = identifier;
        this._tag = "JobNotFoundError";
    }
}
export class JobRepositoryError extends Error {
    constructor(operation, cause) {
        super(`Job repository error during ${operation}: ${String(cause)}`);
        this.operation = operation;
        this.cause = cause;
        this._tag = "JobRepositoryError";
    }
}
export class JobLockedError extends Error {
    constructor(identifier) {
        super(`Job is locked (validated) and cannot be modified: ${identifier}`);
        this.identifier = identifier;
        this._tag = "JobLockedError";
    }
}
/**
 * Create job repository functions
 */
export function createJobRepository(db) {
    return {
        /**
         * Find all jobs
         */
        async findAll() {
            return db.select().from(jobs).orderBy(asc(jobs.description));
        },
        /**
         * Find job by ID
         */
        async findById(id) {
            const results = await db
                .select()
                .from(jobs)
                .where(eq(jobs.id, id))
                .limit(1);
            return results[0] ?? null;
        },
        /**
         * Find job by slug
         */
        async findBySlug(slug) {
            const results = await db
                .select()
                .from(jobs)
                .where(eq(jobs.slug, slug))
                .limit(1);
            return results[0] ?? null;
        },
        /**
         * Find jobs by application pattern
         */
        async findByApplicationPattern(applicationPatternId) {
            return db
                .select()
                .from(jobs)
                .where(eq(jobs.applicationPatternId, applicationPatternId))
                .orderBy(asc(jobs.category), asc(jobs.description));
        },
        /**
         * Find jobs by status
         */
        async findByStatus(status) {
            return db
                .select()
                .from(jobs)
                .where(eq(jobs.status, status))
                .orderBy(asc(jobs.description));
        },
        /**
         * Find job with its fulfilling patterns
         */
        async findWithPatterns(id) {
            // Get the job
            const jobResults = await db
                .select()
                .from(jobs)
                .where(eq(jobs.id, id))
                .limit(1);
            if (jobResults.length === 0) {
                return null;
            }
            const job = jobResults[0];
            // Get related patterns
            const patternIds = await db
                .select({ patternId: patternJobs.patternId })
                .from(patternJobs)
                .where(eq(patternJobs.jobId, id));
            let patterns = [];
            if (patternIds.length > 0) {
                patterns = await db
                    .select()
                    .from(effectPatterns)
                    .where(inArray(effectPatterns.id, patternIds.map((p) => p.patternId)));
            }
            return {
                ...job,
                patterns,
            };
        },
        /**
         * Create a new job
         */
        async create(data) {
            const results = await db.insert(jobs).values(data).returning();
            return results[0];
        },
        /**
         * Update a job
         * Throws JobLockedError if the job is validated/locked
         */
        async update(id, data) {
            // Check if job exists and is locked
            const existing = await this.findById(id);
            if (!existing) {
                return null;
            }
            if (isLocked(existing)) {
                throw new JobLockedError(id);
            }
            const results = await db
                .update(jobs)
                .set({ ...data, updatedAt: new Date() })
                .where(eq(jobs.id, id))
                .returning();
            return results[0] ?? null;
        },
        /**
         * Delete a job
         * Throws JobLockedError if the job is validated/locked
         */
        async delete(id) {
            // Check if job exists and is locked
            const existing = await this.findById(id);
            if (!existing) {
                return false;
            }
            if (isLocked(existing)) {
                throw new JobLockedError(id);
            }
            const results = await db
                .delete(jobs)
                .where(eq(jobs.id, id))
                .returning({ id: jobs.id });
            return results.length > 0;
        },
        /**
         * Upsert a job by slug
         * Throws JobLockedError if the job is validated/locked
         */
        async upsert(data) {
            // Check if job exists and is locked
            if (data.slug) {
                const existing = await this.findBySlug(data.slug);
                if (existing && isLocked(existing)) {
                    throw new JobLockedError(data.slug);
                }
            }
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
                .returning();
            return results[0];
        },
        /**
         * Link a pattern to a job (fulfills relationship)
         */
        async linkPattern(jobId, patternId) {
            await db
                .insert(patternJobs)
                .values({ jobId, patternId })
                .onConflictDoNothing();
        },
        /**
         * Unlink a pattern from a job
         */
        async unlinkPattern(jobId, patternId) {
            await db
                .delete(patternJobs)
                .where(and(eq(patternJobs.jobId, jobId), eq(patternJobs.patternId, patternId)));
        },
        /**
         * Set all patterns for a job (replaces existing links)
         * Throws JobLockedError if the job is validated/locked
         */
        async setPatterns(jobId, patternIds) {
            // Check if job is locked
            const existing = await this.findById(jobId);
            if (!existing) {
                throw new JobNotFoundError(jobId);
            }
            if (isLocked(existing)) {
                throw new JobLockedError(jobId);
            }
            // Delete existing links
            await db.delete(patternJobs).where(eq(patternJobs.jobId, jobId));
            // Insert new links
            if (patternIds.length > 0) {
                await db.insert(patternJobs).values(patternIds.map((patternId) => ({
                    jobId,
                    patternId,
                })));
            }
        },
        /**
         * Get coverage statistics
         */
        async getCoverageStats() {
            const results = await db
                .select({
                status: jobs.status,
                count: sql `count(*)::int`,
            })
                .from(jobs)
                .groupBy(jobs.status);
            const stats = {
                total: 0,
                covered: 0,
                partial: 0,
                gap: 0,
            };
            for (const row of results) {
                const statusKey = row.status;
                if (statusKey in stats && statusKey !== "total") {
                    stats[statusKey] = row.count;
                    stats.total += row.count;
                }
            }
            return stats;
        },
        /**
         * Get coverage statistics by application pattern
         */
        async getCoverageByApplicationPattern(applicationPatternId) {
            const results = await db
                .select({
                status: jobs.status,
                count: sql `count(*)::int`,
            })
                .from(jobs)
                .where(eq(jobs.applicationPatternId, applicationPatternId))
                .groupBy(jobs.status);
            const stats = {
                total: 0,
                covered: 0,
                partial: 0,
                gap: 0,
            };
            for (const row of results) {
                const statusKey = row.status;
                if (statusKey in stats && statusKey !== "total") {
                    stats[statusKey] = row.count;
                    stats.total += row.count;
                }
            }
            return stats;
        },
        /**
         * Lock (validate) a job
         * Sets validated to true and validatedAt to current timestamp
         */
        async lock(id) {
            const results = await db
                .update(jobs)
                .set({
                validated: true,
                validatedAt: new Date(),
                updatedAt: new Date(),
            })
                .where(eq(jobs.id, id))
                .returning();
            return results[0] ?? null;
        },
        /**
         * Unlock (unvalidate) a job
         * Sets validated to false and clears validatedAt
         */
        async unlock(id) {
            const results = await db
                .update(jobs)
                .set({
                validated: false,
                validatedAt: null,
                updatedAt: new Date(),
            })
                .where(eq(jobs.id, id))
                .returning();
            return results[0] ?? null;
        },
        /**
         * Check if a job is locked
         */
        async isLocked(id) {
            const job = await this.findById(id);
            return job ? isLocked(job) : false;
        },
    };
}
//# sourceMappingURL=job.js.map