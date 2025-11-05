"use client";

import { useState, useCallback } from "react";
import { Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type OutcomeFilter = "solved" | "unsolved" | "partial" | "revisited" | null;

export interface MemorySearchFilters {
  query: string;
  tags: string[];
  outcome: OutcomeFilter;
}

export interface MemorySearchProps {
  onFiltersChange: (filters: MemorySearchFilters) => void;
  onSearch: (query: string) => void;
  availableTags?: string[];
  isLoading?: boolean;
}

/**
 * MemorySearch - Search and filter controls for memories
 *
 * Features:
 * - Text search input with debouncing
 * - Tag filtering with pill selection
 * - Outcome filter dropdown
 * - Clear all filters button
 * - Loading state
 * - Real-time filter updates
 */
export function MemorySearch({
  onFiltersChange,
  onSearch,
  availableTags = [
    "effect-ts",
    "error-handling",
    "async",
    "pattern",
    "performance",
    "debugging",
    "best-practices",
    "refactoring",
    "testing",
    "types",
  ],
  isLoading = false,
}: MemorySearchProps) {
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedOutcome, setSelectedOutcome] = useState<OutcomeFilter>(null);
  const [showOutcomeDropdown, setShowOutcomeDropdown] = useState(false);

  // Debounced search handler
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    // Search is triggered by useEffect in parent
  }, []);

  // Update filters whenever any filter changes
  const updateFilters = useCallback((
    newQuery: string,
    newTags: string[],
    newOutcome: OutcomeFilter
  ) => {
    onFiltersChange({
      query: newQuery,
      tags: newTags,
      outcome: newOutcome,
    });
  }, [onFiltersChange]);

  // Handle query submission
  const handleQuerySubmit = () => {
    updateFilters(query, selectedTags, selectedOutcome);
    onSearch(query);
  };

  // Handle tag toggle
  const handleTagToggle = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newTags);
    updateFilters(query, newTags, selectedOutcome);
  };

  // Handle outcome selection
  const handleOutcomeSelect = (outcome: OutcomeFilter) => {
    setSelectedOutcome(outcome);
    setShowOutcomeDropdown(false);
    updateFilters(query, selectedTags, outcome);
  };

  // Handle clear all filters
  const handleClearFilters = () => {
    setQuery("");
    setSelectedTags([]);
    setSelectedOutcome(null);
    updateFilters("", [], null);
  };

  // Determine if any filters are active
  const hasActiveFilters = query.length > 0 || selectedTags.length > 0 || selectedOutcome !== null;

  // Get outcome label and styling
  const getOutcomeLabel = (outcome: OutcomeFilter) => {
    switch (outcome) {
      case "solved":
        return { label: "Solved", color: "text-green-600 dark:text-green-400" };
      case "unsolved":
        return { label: "Unsolved", color: "text-red-600 dark:text-red-400" };
      case "partial":
        return { label: "Partially Solved", color: "text-yellow-600 dark:text-yellow-400" };
      case "revisited":
        return { label: "Revisited", color: "text-blue-600 dark:text-blue-400" };
      default:
        return { label: "All Outcomes", color: "text-muted-foreground" };
    }
  };

  const outcomeLabel = getOutcomeLabel(selectedOutcome);
  const outcomeOptions: (OutcomeFilter)[] = [null, "solved", "unsolved", "partial", "revisited"];

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search memories... (e.g., 'error handling', 'async patterns')"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleQuerySubmit();
              }
            }}
            disabled={isLoading}
            className="pl-10 pr-10"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                updateFilters("", selectedTags, selectedOutcome);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              title="Clear search"
              disabled={isLoading}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Button */}
        <Button
          onClick={handleQuerySubmit}
          disabled={isLoading || !query}
          className="px-6"
        >
          {isLoading ? "Searching..." : "Search"}
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Outcome Filter Dropdown */}
        <div className="relative">
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setShowOutcomeDropdown(!showOutcomeDropdown)}
            disabled={isLoading}
          >
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span>{outcomeLabel.label}</span>
            </div>
            {selectedOutcome && (
              <X
                className="w-4 h-4"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOutcomeSelect(null);
                }}
              />
            )}
          </Button>

          {/* Dropdown Menu */}
          {showOutcomeDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-10">
              {outcomeOptions.map((outcome) => (
                <button
                  key={outcome || "all"}
                  onClick={() => handleOutcomeSelect(outcome)}
                  className={cn(
                    "w-full text-left px-4 py-2 hover:bg-muted transition-colors first:rounded-t-md last:rounded-b-md",
                    selectedOutcome === outcome && "bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-3 h-3 rounded-full border-2",
                        selectedOutcome === outcome
                          ? "bg-primary border-primary"
                          : "border-muted-foreground"
                      )}
                    />
                    <span className="text-sm">
                      {getOutcomeLabel(outcome).label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tag Filter Pills */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">Filter by Tags</div>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagToggle(tag)}
                disabled={isLoading}
                className="outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
              >
                <Badge
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all",
                    selectedTags.includes(tag) && "ring-1 ring-offset-1 ring-primary"
                  )}
                  title={selectedTags.includes(tag) ? "Remove tag filter" : "Add tag filter"}
                >
                  {tag}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Filters Summary & Clear Button */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="text-sm text-muted-foreground">
            {query && <span className="font-medium">Query: "{query}"</span>}
            {query && (selectedTags.length > 0 || selectedOutcome) && " • "}
            {selectedTags.length > 0 && (
              <span className="font-medium">{selectedTags.length} tag{selectedTags.length > 1 ? "s" : ""}</span>
            )}
            {selectedTags.length > 0 && selectedOutcome && " • "}
            {selectedOutcome && <span className="font-medium">Outcome: {outcomeLabel.label}</span>}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            disabled={isLoading}
            className="text-xs"
          >
            Clear All
          </Button>
        </div>
      )}

      {/* Helpful Tips */}
      <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 p-3 rounded-lg">
        <p>💡 <strong>Tips:</strong></p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Use specific keywords for better results (e.g., "async error handling")</li>
          <li>Combine tags and outcomes to narrow results</li>
          <li>Select tags to filter by multiple categories</li>
          <li>Use "Solved" filter to find conversations with good outcomes</li>
        </ul>
      </div>
    </div>
  );
}
