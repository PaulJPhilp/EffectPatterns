/**
 * IO Operations
 *
 * Operations for loading patterns data from PostgreSQL database.
 */
import type { SkillLevel } from "./db/schema/index.js";
import { type Pattern, type PatternsIndex as PatternsIndexData } from "./schemas/pattern.js";
/**
 * Load all patterns from the database
 *
 * @param databaseUrl - Optional database URL
 * @returns Promise that resolves to PatternsIndex
 */
export declare function loadPatternsFromDatabase(databaseUrl?: string): Promise<PatternsIndexData>;
/**
 * Search patterns in the database
 *
 * @param params - Search parameters
 * @param databaseUrl - Optional database URL
 * @returns Promise that resolves to matching patterns
 */
export declare function searchPatternsFromDatabase(params: {
    query?: string;
    category?: string;
    skillLevel?: SkillLevel;
    limit?: number;
    offset?: number;
}, databaseUrl?: string): Promise<Pattern[]>;
/**
 * Get a single pattern by ID/slug from the database
 *
 * @param id - Pattern ID (slug)
 * @param databaseUrl - Optional database URL
 * @returns Promise that resolves to the pattern or null
 */
export declare function getPatternFromDatabase(id: string, databaseUrl?: string): Promise<Pattern | null>;
//# sourceMappingURL=io.d.ts.map