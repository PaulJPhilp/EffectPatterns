/**
 * Production-Ready Pattern Search Service
 *
 * Effect-based pattern search with configuration, logging, caching,
 * and proper error handling for fuzzy matching and filtering.
 */

import { Effect } from 'effect';
import { PatternNotFoundError, SearchError } from '../errors.js';
import type { Pattern, PatternSummary } from '../schemas/pattern.js';
import { ToolkitConfig } from './config.js';
import { ToolkitLogger } from './logger.js';

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
    /** Maximum number of results (optional) */
    limit?: number;
}

/**
 * Pattern search service with production features
 */
export class PatternSearch extends Effect.Service<PatternSearch>()('PatternSearch', {
    effect: Effect.gen(function* () {
        const config = yield* ToolkitConfig;
        const logger = yield* ToolkitLogger;

        const maxResults = yield* config.getMaxSearchResults();
        const searchTimeoutMs = yield* config.getSearchTimeoutMs();
        const isLoggingEnabled = yield* config.isLoggingEnabled();

        /**
         * Simple fuzzy matching score calculator
         */
        const fuzzyScore = (query: string, target: string): number => {
            if (!query) return 1;
            if (!target) return 0;

            let queryIndex = 0;
            let targetIndex = 0;
            let matches = 0;
            let consecutiveMatches = 0;

            while (queryIndex < query.length && targetIndex < target.length) {
                if (query[queryIndex] === target[targetIndex]) {
                    matches++;
                    consecutiveMatches++;
                    queryIndex++;
                } else {
                    consecutiveMatches = 0;
                }
                targetIndex++;
            }

            if (queryIndex !== query.length) return 0;

            const baseScore = matches / query.length;
            const consecutiveBonus = consecutiveMatches / query.length;

            return baseScore * 0.7 + consecutiveBonus * 0.3;
        };

        /**
         * Calculate relevance score for a pattern against a search query
         */
        const calculateRelevance = (pattern: Pattern, query: string): number => {
            const q = query.toLowerCase();

            // Check title (highest weight)
            const titleScore = fuzzyScore(q, pattern.title.toLowerCase());
            if (titleScore > 0) return titleScore * 1.0;

            // Check description (medium weight)
            const descScore = fuzzyScore(q, pattern.description.toLowerCase());
            if (descScore > 0) return descScore * 0.7;

            // Check tags (lower weight)
            const tagScores = pattern.tags.map((tag) => fuzzyScore(q, tag.toLowerCase()));
            const bestTagScore = Math.max(...tagScores, 0);
            if (bestTagScore > 0) return bestTagScore * 0.5;

            // Check category
            const categoryScore = fuzzyScore(q, pattern.category.toLowerCase());
            if (categoryScore > 0) return categoryScore * 0.4;

            return 0;
        };

        /**
         * Search patterns with fuzzy matching and filtering
         */
        const searchPatterns = (params: SearchPatternsParams) =>
            Effect.gen(function* () {
                const startTime = Date.now();
                const operationLogger = logger.withOperation('searchPatterns');

                const { patterns, query, category, difficulty, limit } = params;

                if (isLoggingEnabled) {
                    yield* operationLogger.debug('Starting pattern search', {
                        query,
                        category,
                        difficulty,
                        limit,
                        patternCount: patterns.length
                    });
                }

                // Apply timeout to search operation
                const searchEffect = Effect.gen(function* () {
                    let results = [...patterns];

                    // Apply category filter
                    if (category) {
                        results = results.filter(
                            (p) => p.category.toLowerCase() === category.toLowerCase(),
                        );
                    }

                    // Apply difficulty filter
                    if (difficulty) {
                        results = results.filter(
                            (p) => p.difficulty.toLowerCase() === difficulty.toLowerCase(),
                        );
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

                    // Apply limit (use configured max if not specified)
                    const effectiveLimit = limit || maxResults;
                    if (effectiveLimit > 0) {
                        results = results.slice(0, effectiveLimit);
                    }

                    if (isLoggingEnabled) {
                        yield* operationLogger.info('Pattern search completed', {
                            resultCount: results.length,
                            query,
                            category,
                            difficulty
                        });
                    }

                    return results;
                });

                // Apply timeout
                const result = yield* searchEffect.pipe(
                    Effect.timeout(searchTimeoutMs),
                    Effect.catchTag('TimeoutException', () =>
                        Effect.fail(new SearchError({
                            query,
                            cause: new Error(`Search timeout after ${searchTimeoutMs}ms`)
                        }))
                    )
                );

                if (isLoggingEnabled) {
                    yield* logger.withDuration(startTime, 'searchPatterns')
                        .debug('Search operation timing', { query });
                }

                return result;
            });

        /**
         * Get a single pattern by ID
         */
        const getPatternById = (patterns: Pattern[], id: string) =>
            Effect.gen(function* () {
                const operationLogger = logger.withOperation('getPatternById');

                if (isLoggingEnabled) {
                    yield* operationLogger.debug('Looking up pattern by ID', { id });
                }

                const pattern = patterns.find((p) => p.id === id);

                if (!pattern) {
                    yield* operationLogger.warn('Pattern not found', { id });
                    yield* Effect.fail(new PatternNotFoundError({ patternId: id }));
                }

                if (isLoggingEnabled) {
                    yield* operationLogger.debug('Pattern found', { id, title: pattern!.title });
                }

                return pattern;
            });

        /**
         * Convert Pattern to PatternSummary
         */
        const toPatternSummary = (pattern: Pattern): PatternSummary => ({
            id: pattern.id,
            title: pattern.title,
            description: pattern.description,
            category: pattern.category,
            difficulty: pattern.difficulty,
            tags: pattern.tags,
        });

        return {
            searchPatterns,
            getPatternById,
            toPatternSummary,
        };
    })
}) { }

/**
 * Default pattern search layer
 */
export const PatternSearchLive = PatternSearch.Default;

/**
 * Legacy compatibility functions
 * These will be deprecated in favor of the service-based approach
 */
export function searchPatterns(params: SearchPatternsParams): Pattern[] {
    // Simple implementation for backward compatibility
    const { patterns, query, category, difficulty, limit } = params;
    let results = [...patterns];

    // Apply category filter
    if (category) {
        results = results.filter(
            (p) => p.category.toLowerCase() === category.toLowerCase(),
        );
    }

    // Apply difficulty filter
    if (difficulty) {
        results = results.filter(
            (p) => p.difficulty.toLowerCase() === difficulty.toLowerCase(),
        );
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
 * Normalize separators in a string to spaces
 * Converts hyphens and underscores to spaces for consistent matching
 */
function normalizeSeparators(str: string): string {
    return str.replace(/[-_]+/g, ' ');
}

/**
 * Simple fuzzy matching score calculator (legacy)
 *
 * Now normalizes hyphens and underscores to spaces to allow "error handling"
 * to match "error-handling" and other separator variations.
 */
function fuzzyScore(query: string, target: string): number {
    if (!query) return 1;
    if (!target) return 0;

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
        } else {
            consecutiveMatches = 0;
        }
        targetIndex++;
    }

    if (queryIndex !== normalizedQuery.length) return 0;

    const baseScore = matches / normalizedQuery.length;
    const consecutiveBonus = consecutiveMatches / normalizedQuery.length;

    return baseScore * 0.7 + consecutiveBonus * 0.3;
}

/**
 * Calculate relevance score for a pattern against a search query (legacy)
 *
 * Checks all fields (title, description, tags, category) and returns the
 * highest weighted score. This ensures that even if a query doesn't match
 * the title, it can still find highly relevant results from tags or category.
 */
function calculateRelevance(pattern: Pattern, query: string): number {
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
        titleScore * 1.0,      // Title: highest weight
        descScore * 0.7,       // Description: medium weight
        bestTagScore * 0.5,    // Tags: lower weight
        categoryScore * 0.4,   // Category: lowest weight
    ];

    return Math.max(...scores);
}

/**
 * Get a single pattern by ID (legacy)
 */
export function getPatternById(
    patterns: Pattern[],
    id: string,
): Pattern | undefined {
    return patterns.find((p) => p.id === id);
}

/**
 * Convert Pattern to PatternSummary (legacy)
 */
export function toPatternSummary(pattern: Pattern): PatternSummary {
    return {
        id: pattern.id,
        title: pattern.title,
        description: pattern.description,
        category: pattern.category,
        difficulty: pattern.difficulty,
        tags: pattern.tags,
    };
}