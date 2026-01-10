/**
 * Effect Pattern Repository
 *
 * Repository functions for EffectPattern CRUD and search operations.
 */
import { type EffectPattern, type NewEffectPattern, type SkillLevel } from "../db/schema/index.js";
import type { Database } from "../db/client.js";
/**
 * Repository error types
 */
export declare class EffectPatternNotFoundError extends Error {
    readonly identifier: string;
    readonly _tag = "EffectPatternNotFoundError";
    constructor(identifier: string);
}
export declare class EffectPatternRepositoryError extends Error {
    readonly operation: string;
    readonly cause: unknown;
    readonly _tag = "EffectPatternRepositoryError";
    constructor(operation: string, cause: unknown);
}
export declare class EffectPatternLockedError extends Error {
    readonly identifier: string;
    readonly _tag = "EffectPatternLockedError";
    constructor(identifier: string);
}
/**
 * Search parameters for patterns
 */
export interface SearchPatternsParams {
    query?: string;
    category?: string;
    skillLevel?: SkillLevel;
    tags?: string[];
    applicationPatternId?: string;
    limit?: number;
    offset?: number;
    orderBy?: "title" | "createdAt" | "lessonOrder";
    orderDirection?: "asc" | "desc";
}
/**
 * Create effect pattern repository functions
 */
export declare function createEffectPatternRepository(db: Database): {
    /**
     * Find all effect patterns
     */
    findAll(limit?: number): Promise<EffectPattern[]>;
    /**
     * Find effect pattern by ID
     */
    findById(id: string): Promise<EffectPattern | null>;
    /**
     * Find effect pattern by slug
     */
    findBySlug(slug: string): Promise<EffectPattern | null>;
    /**
     * Search patterns with filters
     */
    search(params: SearchPatternsParams): Promise<EffectPattern[]>;
    /**
     * Find patterns by application pattern ID
     */
    findByApplicationPattern(applicationPatternId: string): Promise<EffectPattern[]>;
    /**
     * Find patterns by skill level
     */
    findBySkillLevel(skillLevel: SkillLevel): Promise<EffectPattern[]>;
    /**
     * Create a new effect pattern
     */
    create(data: NewEffectPattern): Promise<EffectPattern>;
    /**
     * Update an effect pattern
     * Throws EffectPatternLockedError if the pattern is validated/locked
     */
    update(id: string, data: Partial<NewEffectPattern>): Promise<EffectPattern | null>;
    /**
     * Delete an effect pattern
     * Throws EffectPatternLockedError if the pattern is validated/locked
     */
    delete(id: string): Promise<boolean>;
    /**
     * Upsert an effect pattern by slug
     * Throws EffectPatternLockedError if the pattern is validated/locked
     */
    upsert(data: NewEffectPattern): Promise<EffectPattern>;
    /**
     * Get related patterns for a pattern
     */
    getRelatedPatterns(patternId: string): Promise<EffectPattern[]>;
    /**
     * Set related patterns for a pattern
     * Throws EffectPatternLockedError if the pattern is validated/locked
     */
    setRelatedPatterns(patternId: string, relatedPatternIds: string[]): Promise<void>;
    /**
     * Count patterns by skill level
     */
    countBySkillLevel(): Promise<Record<SkillLevel, number>>;
    /**
     * Lock (validate) an effect pattern
     * Sets validated to true and validatedAt to current timestamp
     */
    lock(id: string): Promise<EffectPattern | null>;
    /**
     * Unlock (unvalidate) an effect pattern
     * Sets validated to false and clears validatedAt
     */
    unlock(id: string): Promise<EffectPattern | null>;
    /**
     * Check if a pattern is locked
     */
    isLocked(id: string): Promise<boolean>;
};
export type EffectPatternRepository = ReturnType<typeof createEffectPatternRepository>;
//# sourceMappingURL=effect-pattern.d.ts.map