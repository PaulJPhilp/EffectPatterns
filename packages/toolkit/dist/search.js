/**
 * Pattern Search Functionality
 *
 * Pure functions for searching and filtering patterns using fuzzy
 * matching and filtering by category/difficulty.
 */
/**
 * Simple fuzzy matching score calculator
 *
 * Returns a score between 0 and 1 based on how well the query matches
 * the target string. Higher scores indicate better matches.
 *
 * @param query - Search query (lowercased)
 * @param target - Target string to match against (lowercased)
 * @returns Match score (0-1), or 0 if no match
 */
function fuzzyScore(query, target) {
    if (!query)
        return 1;
    if (!target)
        return 0;
    let queryIndex = 0;
    let targetIndex = 0;
    let matches = 0;
    let consecutiveMatches = 0;
    while (queryIndex < query.length && targetIndex < target.length) {
        if (query[queryIndex] === target[targetIndex]) {
            matches++;
            consecutiveMatches++;
            queryIndex++;
        }
        else {
            consecutiveMatches = 0;
        }
        targetIndex++;
    }
    if (queryIndex !== query.length)
        return 0;
    const baseScore = matches / query.length;
    const consecutiveBonus = consecutiveMatches / query.length;
    return baseScore * 0.7 + consecutiveBonus * 0.3;
}
/**
 * Calculate relevance score for a pattern against a search query
 *
 * @param pattern - Pattern to score
 * @param query - Search query
 * @returns Relevance score (0-1)
 */
function calculateRelevance(pattern, query) {
    const q = query.toLowerCase();
    // Check title (highest weight)
    const titleScore = fuzzyScore(q, pattern.title.toLowerCase());
    if (titleScore > 0)
        return titleScore * 1.0;
    // Check description (medium weight)
    const descScore = fuzzyScore(q, pattern.description.toLowerCase());
    if (descScore > 0)
        return descScore * 0.7;
    // Check tags (lower weight)
    const tagScores = pattern.tags.map((tag) => fuzzyScore(q, tag.toLowerCase()));
    const bestTagScore = Math.max(...tagScores, 0);
    if (bestTagScore > 0)
        return bestTagScore * 0.5;
    // Check category
    const categoryScore = fuzzyScore(q, pattern.category.toLowerCase());
    if (categoryScore > 0)
        return categoryScore * 0.4;
    return 0;
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
export function searchPatterns(params) {
    const { patterns, query, category, difficulty, limit } = params;
    let results = [...patterns];
    // Apply category filter
    if (category) {
        results = results.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }
    // Apply difficulty filter
    if (difficulty) {
        results = results.filter((p) => p.difficulty.toLowerCase() === difficulty.toLowerCase());
    }
    // Apply fuzzy search if query provided
    if (query?.trim()) {
        const scored = results
            .map((pattern) => ({
            pattern,
            score: calculateRelevance(pattern, query.trim()),
        }))
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score);
        results = scored.map((item) => item.pattern);
    }
    // Apply limit
    if (limit && limit > 0) {
        results = results.slice(0, limit);
    }
    return results;
}
/**
 * Get a single pattern by ID
 *
 * @param patterns - Array of patterns to search
 * @param id - Pattern ID
 * @returns Pattern if found, undefined otherwise
 */
export function getPatternById(patterns, id) {
    return patterns.find((p) => p.id === id);
}
/**
 * Convert Pattern to PatternSummary (lighter weight)
 *
 * @param pattern - Full pattern
 * @returns Pattern summary
 */
export function toPatternSummary(pattern) {
    return {
        id: pattern.id,
        title: pattern.title,
        description: pattern.description,
        category: pattern.category,
        difficulty: pattern.difficulty,
        tags: pattern.tags,
    };
}
//# sourceMappingURL=search.js.map