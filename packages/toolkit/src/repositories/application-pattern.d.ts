/**
 * Application Pattern Repository
 *
 * Repository functions for ApplicationPattern CRUD operations.
 */
import { type ApplicationPattern, type NewApplicationPattern } from "../db/schema/index.js";
import type { Database } from "../db/client.js";
/**
 * Repository error types
 */
export declare class ApplicationPatternNotFoundError extends Error {
    readonly identifier: string;
    readonly _tag = "ApplicationPatternNotFoundError";
    constructor(identifier: string);
}
export declare class ApplicationPatternRepositoryError extends Error {
    readonly operation: string;
    readonly cause: unknown;
    readonly _tag = "ApplicationPatternRepositoryError";
    constructor(operation: string, cause: unknown);
}
export declare class ApplicationPatternLockedError extends Error {
    readonly identifier: string;
    readonly _tag = "ApplicationPatternLockedError";
    constructor(identifier: string);
}
/**
 * Create application pattern repository functions
 */
export declare function createApplicationPatternRepository(db: Database): {
    /**
     * Find all application patterns ordered by learning order
     */
    findAll(): Promise<ApplicationPattern[]>;
    /**
     * Find application pattern by ID
     */
    findById(id: string): Promise<ApplicationPattern | null>;
    /**
     * Find application pattern by slug
     */
    findBySlug(slug: string): Promise<ApplicationPattern | null>;
    /**
     * Create a new application pattern
     */
    create(data: NewApplicationPattern): Promise<ApplicationPattern>;
    /**
     * Update an application pattern
     * Throws ApplicationPatternLockedError if the pattern is validated/locked
     */
    update(id: string, data: Partial<NewApplicationPattern>): Promise<ApplicationPattern | null>;
    /**
     * Delete an application pattern
     * Throws ApplicationPatternLockedError if the pattern is validated/locked
     */
    delete(id: string): Promise<boolean>;
    /**
     * Upsert an application pattern by slug
     * Throws ApplicationPatternLockedError if the pattern is validated/locked
     */
    upsert(data: NewApplicationPattern): Promise<ApplicationPattern>;
    /**
     * Lock (validate) an application pattern
     * Sets validated to true and validatedAt to current timestamp
     */
    lock(id: string): Promise<ApplicationPattern | null>;
    /**
     * Unlock (unvalidate) an application pattern
     * Sets validated to false and clears validatedAt
     */
    unlock(id: string): Promise<ApplicationPattern | null>;
    /**
     * Check if a pattern is locked
     */
    isLocked(id: string): Promise<boolean>;
};
export type ApplicationPatternRepository = ReturnType<typeof createApplicationPatternRepository>;
//# sourceMappingURL=application-pattern.d.ts.map