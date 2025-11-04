/**
 * Pattern Search Functionality
 *
 * Pure functions for searching and filtering patterns using fuzzy
 * matching and filtering by category/difficulty.
 */
/**
 * Normalize separators in a string to spaces
 * Converts hyphens and underscores to spaces for consistent matching
 * @param str - String to normalize
 * @returns Normalized string
 */
function normalizeSeparators(str) {
    return str.replace(/[-_]+/g, ' ');
}
/**
 * Simple fuzzy matching score calculator
 *
 * Returns a score between 0 and 1 based on how well the query matches
 * the target string. Higher scores indicate better matches.
 *
 * Normalizes hyphens and underscores to spaces to allow "error handling"
 * to match "error-handling" and other separator variations.
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
    // Normalize separators to handle hyphen/underscore/space variations
    const normalizedQuery = normalizeSeparators(query);
    const normalizedTarget = normalizeSeparators(target);
    let queryIndex = 0;
    let targetIndex = 0;
    let matches = 0;
    let consecutiveMatches = 0;
    while (queryIndex < normalizedQuery.length && targetIndex < normalizedTarget.length) {
        if (normalizedQuery[queryIndex] === normalizedTarget[targetIndex]) {
            matches++;
            consecutiveMatches++;
            queryIndex++;
        }
        else {
            consecutiveMatches = 0;
        }
        targetIndex++;
    }
    if (queryIndex !== normalizedQuery.length)
        return 0;
    const baseScore = matches / normalizedQuery.length;
    const consecutiveBonus = consecutiveMatches / normalizedQuery.length;
    return baseScore * 0.7 + consecutiveBonus * 0.3;
}
/**
 * Calculate relevance score for a pattern against a search query
 *
 * Checks all fields (title, description, tags, category) and returns the
 * highest weighted score. This ensures that even if a query doesn't match
 * the title, it can still find highly relevant results from tags or category.
 *
 * @param pattern - Pattern to score
 * @param query - Search query
 * @returns Relevance score (0-1)
 */
function calculateRelevance(pattern, query) {
    const q = query.toLowerCase();
    // Check all fields and collect scores with their weights
    const titleScore = fuzzyScore(q, pattern.title.toLowerCase());
    const descScore = fuzzyScore(q, pattern.description.toLowerCase());
    const tagScores = pattern.tags.map((tag) => fuzzyScore(q, tag.toLowerCase()));
    const bestTagScore = Math.max(...tagScores, 0);
    const categoryScore = fuzzyScore(q, pattern.category.toLowerCase());
    // Apply weights and find the highest score
    // This ensures tags and categories can match even if title doesn't
    const scores = [
        titleScore * 1.0, // Title: highest weight
        descScore * 0.7, // Description: medium weight
        bestTagScore * 0.5, // Tags: lower weight
        categoryScore * 0.4, // Category: lowest weight
    ];
    return Math.max(...scores);
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