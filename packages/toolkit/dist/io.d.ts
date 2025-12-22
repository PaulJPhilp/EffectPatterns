/**
 * IO Operations
 *
 * Operations for loading patterns data from both
 * file system (legacy) and PostgreSQL database (primary).
 */
import { type PatternsIndex as PatternsIndexData, type Pattern } from "./schemas/pattern.js";
import type { SkillLevel } from "./db/schema/index.js";
/**
 * Load and parse patterns from a JSON file (legacy, sync)
 *
 * @param filePath - Absolute path to patterns.json
 * @returns Validated PatternsIndex
 * @throws Error if file cannot be read or parsed
 * @deprecated Use loadPatternsFromDatabase for new code
 */
export declare function loadPatternsFromJsonSync(filePath: string): PatternsIndexData;
/**
 * Load and parse patterns from a JSON file (legacy, async)
 *
 * @param filePath - Absolute path to patterns.json
 * @returns Promise that resolves to validated PatternsIndex
 * @deprecated Use loadPatternsFromDatabase for new code
 */
export declare function loadPatternsFromJson(filePath: string): Promise<PatternsIndexData>;
/**
 * Legacy alias for compatibility
 * @deprecated Use loadPatternsFromJson
 */
export declare const loadPatternsFromJsonRunnable: typeof loadPatternsFromJson;
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