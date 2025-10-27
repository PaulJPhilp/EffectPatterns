/**
 * Pattern Search Functionality
 *
 * Pure functions for searching and filtering patterns using fuzzy
 * matching and filtering by category/difficulty.
 */
import type { Pattern, PatternSummary } from './schemas/pattern.js';
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
 * Search patterns with fuzzy matching and filtering
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
 * Get a single pattern by ID
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
//# sourceMappingURL=search.d.ts.map