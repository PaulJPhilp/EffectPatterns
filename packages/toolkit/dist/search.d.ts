/**
 * Pattern Search Functionality
 *
 * Pure functions for searching and filtering patterns using fuzzy
 * matching and filtering by category/difficulty.
 */
import { Pattern, PatternSummary } from "./schemas/pattern.js";
/**
 * Search patterns with fuzzy matching and filtering
 *
 * @param patterns - Array of patterns to search
 * @param query - Search query (optional)
 * @param category - Filter by category (optional)
 * @param difficulty - Filter by difficulty (optional)
 * @param limit - Maximum number of results (default: no limit)
 * @returns Matched patterns sorted by relevance
 */
export declare function searchPatterns(patterns: Pattern[], query?: string, category?: string, difficulty?: string, limit?: number): Pattern[];
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