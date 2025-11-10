'use client';

/**
 * usePatternRetrieval Hook
 * React hook for implementing retrieval-augmented generation (RAG) with Effect-TS patterns.
 * Handles pattern scoring, fetching, and state management for the chat interface.
 */

import type { Pattern } from '@/src/services/patterns-service/types';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UsePatternRetrievalState {
    patterns: Pattern[];
    isLoading: boolean;
    error: Error | null;
    isRelevant: boolean;
    relevanceScore: number;
}

export interface UsePatternRetrievalOptions {
    enabled?: boolean;
    minRelevanceScore?: number;
    maxPatterns?: number;
    cacheEnabled?: boolean;
}

/**
 * Hook for retrieving relevant Effect-TS patterns for a user query
 * Implements smart caching and error handling
 *
 * @param query - The user's chat message to evaluate for pattern relevance
 * @param options - Configuration options for pattern retrieval
 * @returns Current state of pattern retrieval and methods to trigger searches
 */
export function usePatternRetrieval(
    query: string,
    options: UsePatternRetrievalOptions = {}
) {
    const {
        enabled = true,
        minRelevanceScore = 0.5,
        maxPatterns = 3,
        cacheEnabled = true,
    } = options;

    const [state, setState] = useState<UsePatternRetrievalState>({
        patterns: [],
        isLoading: false,
        error: null,
        isRelevant: false,
        relevanceScore: 0,
    });

    const cacheRef = useRef<Map<string, UsePatternRetrievalState>>(new Map());
    const abortControllerRef = useRef<AbortController | null>(null);

    /**
     * Score the query and retrieve patterns if relevant
     */
    const retrievePatterns = useCallback(async () => {
        if (!enabled || !query.trim()) {
            setState((prev) => ({ ...prev, patterns: [], isRelevant: false }));
            return;
        }

        // Check cache first
        if (cacheEnabled && cacheRef.current.has(query)) {
            setState(cacheRef.current.get(query)!);
            return;
        }

        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        try {
            // Cancel any previous requests
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            abortControllerRef.current = new AbortController();

            // Step 1: Score the query
            const scoringResponse = await fetch('/api/patterns/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
                signal: abortControllerRef.current.signal,
            });

            if (!scoringResponse.ok) {
                throw new Error(`Scoring failed: ${scoringResponse.statusText}`);
            }

            const scoring = await scoringResponse.json();
            const isRelevant = scoring.score >= minRelevanceScore;

            if (!isRelevant) {
                const newState: UsePatternRetrievalState = {
                    patterns: [],
                    isLoading: false,
                    error: null,
                    isRelevant: false,
                    relevanceScore: scoring.score,
                };
                setState(newState);
                if (cacheEnabled) {
                    cacheRef.current.set(query, newState);
                }
                return;
            }

            // Step 2: Retrieve patterns if relevant
            const patternsResponse = await fetch('/api/patterns/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    topics: scoring.suggestedTopics,
                    limit: maxPatterns,
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!patternsResponse.ok) {
                throw new Error(`Pattern retrieval failed: ${patternsResponse.statusText}`);
            }

            const patterns: Pattern[] = await patternsResponse.json();

            const newState: UsePatternRetrievalState = {
                patterns,
                isLoading: false,
                error: null,
                isRelevant: true,
                relevanceScore: scoring.score,
            };

            setState(newState);
            if (cacheEnabled) {
                cacheRef.current.set(query, newState);
            }
        } catch (error) {
            // Ignore abort errors
            if (error instanceof Error && error.name === 'AbortError') {
                return;
            }

            const errorObj = error instanceof Error ? error : new Error('Unknown error');
            setState((prev) => ({
                ...prev,
                isLoading: false,
                error: errorObj,
                patterns: [],
            }));
        }
    }, [enabled, query, minRelevanceScore, maxPatterns, cacheEnabled]);

    /**
     * Effect: Retrieve patterns when query changes
     */
    useEffect(() => {
        retrievePatterns();

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [retrievePatterns]);

    /**
     * Clear cache for testing or manual refresh
     */
    const clearCache = useCallback(() => {
        cacheRef.current.clear();
    }, []);

    /**
     * Manually trigger pattern retrieval with custom options
     */
    const retryWithOptions = useCallback(
        async (customOptions: Partial<UsePatternRetrievalOptions>) => {
            // Would need to update state with new options here
            // For now, just re-run retrieval
            await retrievePatterns();
        },
        [options, retrievePatterns]
    );

    return {
        ...state,
        clearCache,
        retryWithOptions,
    };
}

/**
 * Hook for getting pattern context string for inclusion in system prompt
 * Formats retrieved patterns into a concise context string
 */
export function usePatternContext(patterns: Pattern[]): string {
    return patterns
        .map(
            (p) =>
                `## ${p.title} (${p.skillLevel})
${p.description}
Tags: ${p.tags.join(', ')}`
        )
        .join('\n\n');
}

/**
 * Hook for managing pattern display state in UI
 * Handles showing/hiding pattern cards and filtering
 */
export interface PatternDisplayOptions {
    showOnlyRelevant?: boolean;
    groupBySkillLevel?: boolean;
    sortBy?: 'relevance' | 'skillLevel' | 'title';
}

export function usePatternDisplay(
    patterns: Pattern[],
    options: PatternDisplayOptions = {}
) {
    const {
        showOnlyRelevant = true,
        groupBySkillLevel = false,
        sortBy = 'relevance',
    } = options;

    const [expandedPatternId, setExpandedPatternId] = useState<string | null>(null);

    // Filter patterns
    const filteredPatterns = showOnlyRelevant
        ? patterns.filter((p) => p.relevanceScore !== undefined && p.relevanceScore > 0.3)
        : patterns;

    // Sort patterns
    const sortedPatterns = [...filteredPatterns].sort((a, b) => {
        switch (sortBy) {
            case 'relevance':
                return (b.relevanceScore || 0) - (a.relevanceScore || 0);
            case 'skillLevel':
                const levels = { beginner: 0, intermediate: 1, advanced: 2 };
                return levels[a.skillLevel] - levels[b.skillLevel];
            case 'title':
                return a.title.localeCompare(b.title);
            default:
                return 0;
        }
    });

    // Group by skill level if requested
    const groupedPatterns = groupBySkillLevel
        ? sortedPatterns.reduce(
            (acc, pattern) => {
                const level = pattern.skillLevel;
                if (!acc[level]) {
                    acc[level] = [];
                }
                acc[level].push(pattern);
                return acc;
            },
            {} as Record<string, Pattern[]>
        )
        : { all: sortedPatterns };

    return {
        patterns: sortedPatterns,
        groupedPatterns,
        expandedPatternId,
        setExpandedPatternId,
    };
}
