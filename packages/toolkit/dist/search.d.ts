/**
 * Pattern Search Functionality
 *
 * Pure functions for searching and filtering patterns using fuzzy
 * matching and filtering by category/difficulty.
 *
 * Supports both in-memory search (legacy) and database-backed search.
 */
import type { SkillLevel } from "./db/schema/index.js";
import type { Pattern, PatternSummary } from "./schemas/pattern.js";
/**
 * Parameters for searching patterns
 */
export interface SearchPatternsParams {
    /** Array of patterns to search */
    patterns: Pattern[];
    /** Search query (optional) */
    query?: string;
    /** Filter by category (optional) */
    category?: string;
    /** Filter by difficulty level (optional) */
    difficulty?: string;
    /** Maximum number of results (default: no limit) */
    limit?: number;
}
/**
 * Search patterns with fuzzy matching and filtering (in-memory)
 *
 * @param params - Search parameters
 * @returns Matched patterns sorted by relevance
 * @example
 * ```typescript
 * const results = searchPatterns({
 *   patterns: allPatterns,
 *   query: "retry",
 *   difficulty: "intermediate",
 *   limit: 10
 * })
 * ```
 */
export declare function searchPatterns(params: SearchPatternsParams): Pattern[];
/**
 * Get a single pattern by ID (in-memory)
 *
 * @param patterns - Array of patterns to search
 * @param id - Pattern ID
 * @returns Pattern if found, undefined otherwise
 */
export declare function getPatternById(patterns: Pattern[], id: string): Pattern | undefined;
/**
 * Convert Pattern to PatternSummary (lighter weight)
 *
 * @param pattern - Full pattern
 * @returns Pattern summary
 */
export declare function toPatternSummary(pattern: Pattern): PatternSummary;
/**
 * Parameters for database search
 */
export interface DatabaseSearchParams {
    /** Search query (optional) */
    query?: string;
    /** Filter by category (optional) */
    category?: string;
    /** Filter by skill level (optional) */
    skillLevel?: SkillLevel;
    /** Maximum number of results (default: no limit) */
    limit?: number;
    /** Offset for pagination */
    offset?: number;
}
/**
 * Search patterns using database
 *
 * @param params - Search parameters
 * @param databaseUrl - Optional database URL
 * @returns Promise resolving to matched patterns
 */
export declare function searchPatternsDb(params: DatabaseSearchParams, databaseUrl?: string): Promise<Pattern[]>;
/**
 * Get a pattern by ID/slug from database
 *
 * @param id - Pattern ID (slug)
 * @param databaseUrl - Optional database URL
 * @returns Promise resolving to the pattern or null
 */
export declare function getPatternByIdDb(id: string, databaseUrl?: string): Promise<Pattern | null>;
/**
 * Count patterns by skill level from database
 *
 * @param databaseUrl - Optional database URL
 * @returns Promise resolving to counts by skill level
 */
export declare function countPatternsBySkillLevelDb(databaseUrl?: string): Promise<Record<SkillLevel, number>>;
/**
 * Summary shape returned by skill search functions
 */
export interface SkillSummary {
    readonly slug: string;
    readonly name: string;
    readonly description: string;
    readonly category: string;
    readonly patternCount: number;
    readonly version: number;
    readonly content?: string;
}
/**
 * Parameters for skill database search
 */
export interface SkillSearchParams {
    /** Search query (optional) */
    readonly query?: string;
    /** Filter by category (optional) */
    readonly category?: string;
    /** Maximum number of results */
    readonly limit?: number;
    /** Offset for pagination */
    readonly offset?: number;
}
/**
 * Search skills using database
 *
 * @param params - Search parameters
 * @param databaseUrl - Optional database URL
 * @returns Promise resolving to matched skill summaries (without content)
 */
export declare function searchSkillsDb(params: SkillSearchParams, databaseUrl?: string): Promise<SkillSummary[]>;
/**
 * Get a skill by slug from database (includes full content)
 *
 * @param slug - Skill slug
 * @param databaseUrl - Optional database URL
 * @returns Promise resolving to the skill or null
 */
export declare function getSkillBySlugDb(slug: string, databaseUrl?: string): Promise<SkillSummary | null>;
//# sourceMappingURL=search.d.ts.map