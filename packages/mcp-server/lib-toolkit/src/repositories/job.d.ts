/**
 * Job Repository
 *
 * Repository functions for Job (Jobs-to-be-Done) CRUD operations.
 */
import { type Job, type NewJob, type JobStatus, type EffectPattern } from "../db/schema/index.js";
import type { Database } from "../db/client.js";
/**
 * Repository error types
 */
export declare class JobNotFoundError extends Error {
    readonly identifier: string;
    readonly _tag = "JobNotFoundError";
    constructor(identifier: string);
}
export declare class JobRepositoryError extends Error {
    readonly operation: string;
    readonly cause: unknown;
    readonly _tag = "JobRepositoryError";
    constructor(operation: string, cause: unknown);
}
export declare class JobLockedError extends Error {
    readonly identifier: string;
    readonly _tag = "JobLockedError";
    constructor(identifier: string);
}
/**
 * Job with related patterns
 */
export interface JobWithPatterns extends Job {
    patterns: EffectPattern[];
}
/**
 * Create job repository functions
 */
export declare function createJobRepository(db: Database): {
    /**
     * Find all jobs
     */
    findAll(): Promise<Job[]>;
    /**
     * Find job by ID
     */
    findById(id: string): Promise<Job | null>;
    /**
     * Find job by slug
     */
    findBySlug(slug: string): Promise<Job | null>;
    /**
     * Find jobs by application pattern
     */
    findByApplicationPattern(applicationPatternId: string): Promise<Job[]>;
    /**
     * Find jobs by status
     */
    findByStatus(status: JobStatus): Promise<Job[]>;
    /**
     * Find job with its fulfilling patterns
     */
    findWithPatterns(id: string): Promise<JobWithPatterns | null>;
    /**
     * Create a new job
     */
    create(data: NewJob): Promise<Job>;
    /**
     * Update a job
     * Throws JobLockedError if the job is validated/locked
     */
    update(id: string, data: Partial<NewJob>): Promise<Job | null>;
    /**
     * Delete a job
     * Throws JobLockedError if the job is validated/locked
     */
    delete(id: string): Promise<boolean>;
    /**
     * Upsert a job by slug
     * Throws JobLockedError if the job is validated/locked
     */
    upsert(data: NewJob): Promise<Job>;
    /**
     * Link a pattern to a job (fulfills relationship)
     */
    linkPattern(jobId: string, patternId: string): Promise<void>;
    /**
     * Unlink a pattern from a job
     */
    unlinkPattern(jobId: string, patternId: string): Promise<void>;
    /**
     * Set all patterns for a job (replaces existing links)
     * Throws JobLockedError if the job is validated/locked
     */
    setPatterns(jobId: string, patternIds: string[]): Promise<void>;
    /**
     * Get coverage statistics
     */
    getCoverageStats(): Promise<{
        total: number;
        covered: number;
        partial: number;
        gap: number;
    }>;
    /**
     * Get coverage statistics by application pattern
     */
    getCoverageByApplicationPattern(applicationPatternId: string): Promise<{
        total: number;
        covered: number;
        partial: number;
        gap: number;
    }>;
    /**
     * Lock (validate) a job
     * Sets validated to true and validatedAt to current timestamp
     */
    lock(id: string): Promise<Job | null>;
    /**
     * Unlock (unvalidate) a job
     * Sets validated to false and clears validatedAt
     */
    unlock(id: string): Promise<Job | null>;
    /**
     * Check if a job is locked
     */
    isLocked(id: string): Promise<boolean>;
};
export type JobRepository = ReturnType<typeof createJobRepository>;
//# sourceMappingURL=job.d.ts.map