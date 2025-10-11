/**
 * Pattern Service - Simple wrapper around toolkit pure functions
 *
 * Since we're in a web app without access to the file system,
 * we'll use the MCP Client instead. This file is kept for future
 * potential use with local pattern data.
 */

import {
  searchPatterns,
  getPatternById,
  toPatternSummary,
  type Pattern,
  type PatternSummary,
} from "@effect-patterns/toolkit"

/**
 * Search patterns (pure function)
 */
export function searchPatternsLocal(
  patterns: Pattern[],
  query?: string,
  category?: string,
  difficulty?: string,
  limit?: number
): PatternSummary[] {
  const results = searchPatterns(patterns, query, category, difficulty, limit)
  return results.map(toPatternSummary)
}

/**
 * Get pattern by ID (pure function)
 */
export function getPatternByIdLocal(
  patterns: Pattern[],
  id: string
): Pattern | undefined {
  return getPatternById(patterns, id)
}
