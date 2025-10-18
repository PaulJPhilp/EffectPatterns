/**
 * Pattern Service - Simple wrapper around toolkit pure functions
 *
 * Since we're in a web app without access to the file system,
 * we'll use the MCP Client instead. This file is kept for future
 * potential use with local pattern data.
 */

import {
  getPatternById,
  type Pattern,
  type PatternSummary,
  searchPatterns,
  toPatternSummary,
} from '@effect-patterns/toolkit';

type SearchOptions = {
  readonly query?: string;
  readonly category?: string;
  readonly difficulty?: string;
  readonly limit?: number;
};

/**
 * Search patterns (pure function)
 */
export function searchPatternsLocal(
  patterns: readonly Pattern[],
  options: SearchOptions = {}
): PatternSummary[] {
  const { query, category, difficulty, limit } = options;
  const results = searchPatterns(patterns, query, category, difficulty, limit);
  return results.map(toPatternSummary);
}

/**
 * Get pattern by ID (pure function)
 */
export function getPatternByIdLocal(
  patterns: readonly Pattern[],
  id: string
): Pattern | undefined {
  return getPatternById(patterns, id);
}
