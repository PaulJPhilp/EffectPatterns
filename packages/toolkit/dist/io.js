/**
 * IO Operations
 *
 * Operations for loading patterns data from both
 * file system (legacy) and PostgreSQL database (primary).
 */
import { Schema as S } from "@effect/schema";
import * as TreeFormatter from "@effect/schema/TreeFormatter";
import * as fs from "node:fs";
import { PatternsIndex as PatternsIndexSchema, } from "./schemas/pattern.js";
import { createDatabase } from "./db/client.js";
import { createEffectPatternRepository } from "./repositories/index.js";
// ============================================
// Legacy File-Based Loading
// ============================================
/**
 * Load and parse patterns from a JSON file (legacy, sync)
 *
 * @param filePath - Absolute path to patterns.json
 * @returns Validated PatternsIndex
 * @throws Error if file cannot be read or parsed
 * @deprecated Use loadPatternsFromDatabase for new code
 */
export function loadPatternsFromJsonSync(filePath) {
    const content = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(content);
    const decodedEither = S.decodeUnknownEither(PatternsIndexSchema)(json);
    if (decodedEither._tag === "Left") {
        const message = TreeFormatter.formatErrorSync(decodedEither.left);
        throw new Error(`Invalid patterns index: ${message}`);
    }
    return decodedEither.right;
}
/**
 * Load and parse patterns from a JSON file (legacy, async)
 *
 * @param filePath - Absolute path to patterns.json
 * @returns Promise that resolves to validated PatternsIndex
 * @deprecated Use loadPatternsFromDatabase for new code
 */
export async function loadPatternsFromJson(filePath) {
    const content = await fs.promises.readFile(filePath, "utf-8");
    const json = JSON.parse(content);
    const decodedEither = S.decodeUnknownEither(PatternsIndexSchema)(json);
    if (decodedEither._tag === "Left") {
        const message = TreeFormatter.formatErrorSync(decodedEither.left);
        throw new Error(`Invalid patterns index: ${message}`);
    }
    return decodedEither.right;
}
/**
 * Legacy alias for compatibility
 * @deprecated Use loadPatternsFromJson
 */
export const loadPatternsFromJsonRunnable = loadPatternsFromJson;
// ============================================
// Database-Based Loading
// ============================================
/**
 * Convert database EffectPattern to legacy Pattern format
 */
function dbPatternToLegacy(dbPattern) {
    return {
        id: dbPattern.slug,
        title: dbPattern.title,
        description: dbPattern.summary,
        category: dbPattern.category || "error-handling",
        difficulty: dbPattern.skillLevel || "intermediate",
        tags: dbPattern.tags || [],
        examples: dbPattern.examples || [],
        useCases: dbPattern.useCases || [],
        relatedPatterns: undefined,
        effectVersion: undefined,
        createdAt: dbPattern.createdAt?.toISOString(),
        updatedAt: dbPattern.updatedAt?.toISOString(),
    };
}
/**
 * Load all patterns from the database
 *
 * @param databaseUrl - Optional database URL
 * @returns Promise that resolves to PatternsIndex
 */
export async function loadPatternsFromDatabase(databaseUrl) {
    const { db, close } = createDatabase(databaseUrl);
    try {
        const repo = createEffectPatternRepository(db);
        const dbPatterns = await repo.findAll();
        const patterns = dbPatterns.map(dbPatternToLegacy);
        return {
            patterns,
            version: "1.0.0",
            lastUpdated: new Date().toISOString(),
        };
    }
    finally {
        await close();
    }
}
/**
 * Search patterns in the database
 *
 * @param params - Search parameters
 * @param databaseUrl - Optional database URL
 * @returns Promise that resolves to matching patterns
 */
export async function searchPatternsFromDatabase(params, databaseUrl) {
    const { db, close } = createDatabase(databaseUrl);
    try {
        const repo = createEffectPatternRepository(db);
        const dbPatterns = await repo.search(params);
        return dbPatterns.map(dbPatternToLegacy);
    }
    finally {
        await close();
    }
}
/**
 * Get a single pattern by ID/slug from the database
 *
 * @param id - Pattern ID (slug)
 * @param databaseUrl - Optional database URL
 * @returns Promise that resolves to the pattern or null
 */
export async function getPatternFromDatabase(id, databaseUrl) {
    const { db, close } = createDatabase(databaseUrl);
    try {
        const repo = createEffectPatternRepository(db);
        const dbPattern = await repo.findBySlug(id);
        if (!dbPattern) {
            return null;
        }
        return dbPatternToLegacy(dbPattern);
    }
    finally {
        await close();
    }
}
//# sourceMappingURL=io.js.map