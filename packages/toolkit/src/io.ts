/**
 * IO Operations
 *
 * Operations for loading patterns data from PostgreSQL database.
 */

import { createDatabase } from "./db/client.js";
import type {
  EffectPattern as DbEffectPattern,
  SkillLevel,
} from "./db/schema/index.js";
import { createEffectPatternRepository } from "./repositories/index.js";
import {
  type Pattern,
  type PatternsIndex as PatternsIndexData,
} from "./schemas/pattern.js";

/**
 * Convert database EffectPattern to legacy Pattern format
 */
function dbPatternToLegacy(dbPattern: DbEffectPattern): Pattern {
  return {
    id: dbPattern.slug,
    title: dbPattern.title,
    description: dbPattern.summary,
    category: (dbPattern.category as Pattern["category"]) || "error-handling",
    difficulty:
      (dbPattern.skillLevel as Pattern["difficulty"]) || "intermediate",
    tags: (dbPattern.tags as string[]) || [],
    examples: (dbPattern.examples as Pattern["examples"]) || [],
    useCases: (dbPattern.useCases as string[]) || [],
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
export async function loadPatternsFromDatabase(
  databaseUrl?: string
): Promise<PatternsIndexData> {
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
  } finally {
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
export async function searchPatternsFromDatabase(
  params: {
    query?: string;
    category?: string;
    skillLevel?: SkillLevel;
    limit?: number;
    offset?: number;
  },
  databaseUrl?: string
): Promise<Pattern[]> {
  const { db, close } = createDatabase(databaseUrl);

  try {
    const repo = createEffectPatternRepository(db);
    const dbPatterns = await repo.search(params);
    return dbPatterns.map(dbPatternToLegacy);
  } finally {
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
export async function getPatternFromDatabase(
  id: string,
  databaseUrl?: string
): Promise<Pattern | null> {
  const { db, close } = createDatabase(databaseUrl);

  try {
    const repo = createEffectPatternRepository(db);
    const dbPattern = await repo.findBySlug(id);

    if (!dbPattern) {
      return null;
    }

    return dbPatternToLegacy(dbPattern);
  } finally {
    await close();
  }
}
