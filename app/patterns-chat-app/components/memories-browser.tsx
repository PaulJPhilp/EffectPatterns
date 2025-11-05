"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MemorySearch, MemorySearchFilters, type OutcomeFilter } from "@/components/memory-search";
import { MemoryCard, MemoryCardSkeleton } from "@/components/memory-card";
import { AlertCircle, Inbox } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { PaginatedSearchResults, SemanticSearchResult } from "@/lib/semantic-search/search";

export interface MemoriesBrowserProps {
  initialQuery?: string;
  onMemorySelect?: (memory: SemanticSearchResult) => void;
  isSelectable?: boolean;
  title?: string;
  description?: string;
}

/**
 * MemoriesBrowser - Full-featured memory browsing with infinite scroll
 *
 * Features:
 * - Integrated search and filter controls (MemorySearch)
 * - Memory result cards (MemoryCard)
 * - Infinite scroll pagination with IntersectionObserver
 * - Loading states (MemoryCardSkeleton)
 * - Empty state messaging
 * - Error handling
 * - Debounced search
 */
export function MemoriesBrowser({
  initialQuery = "",
  onMemorySelect,
  isSelectable = false,
  title = "Browse Memories",
  description = "Search and explore your conversation history",
}: MemoriesBrowserProps) {
  // State management
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [filters, setFilters] = useState<MemorySearchFilters>({
    query: initialQuery,
    tags: [],
    outcome: null,
  });
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMemories, setSelectedMemories] = useState<Set<string>>(new Set());

  // Refs
  const observerTarget = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastQueryRef = useRef("");

  // Fetch memories from API
  const fetchMemories = useCallback(
    async (isLoadMore: boolean = false) => {
      // Validate query before making API call
      if (!isLoadMore && filters.query.trim() === "") {
        setError("Please enter a search query");
        setIsLoading(false);
        return;
      }

      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setError(null);
        setResults([]);
        setOffset(0);
      }

      try {
        const params = new URLSearchParams({
          q: filters.query,
          limit: "20",
          offset: isLoadMore ? offset.toString() : "0",
          ...(filters.tags.length > 0 && { tag: filters.tags[0] }), // API supports single tag filter
          ...(filters.outcome && { outcome: filters.outcome }),
        });

        const response = await fetch(`/api/search?${params}`);

        if (!response.ok) {
          throw new Error(
            response.status === 400
              ? "Please enter a search query"
              : `Search failed: ${response.statusText}`
          );
        }

        const data: PaginatedSearchResults = await response.json();

        if (isLoadMore) {
          // Append new results
          setResults((prev) => [...prev, ...data.results]);
        } else {
          // Replace results
          setResults(data.results);
        }

        setTotal(data.total);
        setHasMore(data.hasMore);
        setOffset(data.nextOffset ?? data.offset + data.limit);
        lastQueryRef.current = filters.query;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        console.error("[MemoriesBrowser] Search error:", err);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [filters, offset]
  );

  // Handle search submission
  const handleSearch = useCallback(() => {
    // Only search if query changed or has content
    if (filters.query.trim() === "") {
      setError("Please enter a search query");
      return;
    }

    if (filters.query === lastQueryRef.current && results.length > 0) {
      // Same query, don't search again
      return;
    }

    fetchMemories(false);
  }, [filters, fetchMemories, results.length]);

  // Handle filter changes (debounced)
  const handleFiltersChange = useCallback(
    (newFilters: MemorySearchFilters) => {
      setFilters(newFilters);

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Debounce search by 500ms
      searchTimeoutRef.current = setTimeout(() => {
        if (newFilters.query.trim() !== "") {
          fetchMemories(false);
        }
      }, 500);
    },
    [fetchMemories]
  );

  // Infinite scroll observer
  useEffect(() => {
    if (!observerTarget.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          fetchMemories(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px", // Start loading 100px before reaching bottom
      }
    );

    observer.observe(observerTarget.current);

    return () => observer.disconnect();
  }, [hasMore, isLoading, isLoadingMore, fetchMemories]);

  // Handle memory selection
  const handleMemorySelect = (memory: SemanticSearchResult) => {
    if (isSelectable) {
      setSelectedMemories((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(memory.id)) {
          newSet.delete(memory.id);
        } else {
          newSet.add(memory.id);
        }
        return newSet;
      });
    }
    onMemorySelect?.(memory);
  };

  // Reset selected memories when results change
  useEffect(() => {
    setSelectedMemories(new Set());
  }, [filters.query]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-muted-foreground mt-2">{description}</p>
      </div>

      {/* Search and Filters */}
      <MemorySearch
        onFiltersChange={handleFiltersChange}
        onSearch={handleSearch}
        isLoading={isLoading}
      />

      {/* Scrollable Results Container */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-4">
        {/* Results Summary */}
        {total > 0 && !isLoading && (
          <div className="text-sm text-muted-foreground">
            Showing {results.length} of {total} memories
            {filters.tags.length > 0 && ` with tag: ${filters.tags[0]}`}
            {filters.outcome && ` (${filters.outcome})`}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <MemoryCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Results */}
        {!isLoading && results.length > 0 && (
          <div className="space-y-3">
            {results.map((result) => (
              <MemoryCard
                key={result.id}
                result={result}
                isSelectable={isSelectable}
                isSelected={selectedMemories.has(result.id)}
                onSelect={handleMemorySelect}
              />
            ))}

            {/* Load more trigger */}
            {hasMore && (
              <div
                ref={observerTarget}
                className="flex justify-center items-center py-8"
              >
                {isLoadingMore && (
                  <>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    <span className="ml-3 text-muted-foreground">Loading more...</span>
                  </>
                )}
              </div>
            )}

            {/* End of results */}
            {!hasMore && results.length > 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">✨ You've reached the end of your memories</p>
                <p className="text-xs mt-1">Loaded {total} total memories</p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && results.length === 0 && !error && filters.query.trim() !== "" && (
          <div className="text-center py-12">
            <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-muted-foreground">No memories found</h3>
            <p className="text-muted-foreground mt-1">
              Try adjusting your search or filters
            </p>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>💡 Tips:</p>
              <ul className="space-y-1">
                <li>• Use different keywords or phrases</li>
                <li>• Remove tag filters to broaden search</li>
                <li>• Check spelling and syntax</li>
                <li>• Try searching for related topics</li>
              </ul>
            </div>
          </div>
        )}

        {/* Initial State */}
        {!isLoading && results.length === 0 && !error && filters.query.trim() === "" && (
          <div className="text-center py-12">
            <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-muted-foreground">Start searching</h3>
            <p className="text-muted-foreground mt-1">
              Enter a query or apply filters to browse your memories
            </p>
          </div>
        )}
      </div>

      {/* Selection Summary (if selectable) */}
      {isSelectable && selectedMemories.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className="text-sm font-medium">
              {selectedMemories.size} memory{selectedMemories.size > 1 ? "ies" : ""} selected
            </p>
            <div className="space-x-2">
              <button
                onClick={() => setSelectedMemories(new Set())}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Standalone MemoriesBrowserPage component
 * Can be used as a full page or embedded in other pages
 */
export function MemoriesBrowserPage() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <MemoriesBrowser
        title="Browse Memories"
        description="Search and explore your entire conversation history with advanced filtering"
      />
    </div>
  );
}
