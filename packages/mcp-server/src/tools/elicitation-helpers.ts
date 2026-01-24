/**
 * Elicitation Helpers for MCP Tools
 *
 * Provides structured elicitation responses when user input is
 * insufficient or ambiguous. Returns clean prompts without narration.
 */

import type { TextContent } from "../schemas/structured-output.js";
import { createTextBlock } from "../mcp-content-builders.js";
import type { Elicitation } from "../schemas/output-schemas.js";

/**
 * Create an elicitation response for missing search query
 */
export function elicitSearchQuery(): {
  content: TextContent[];
  structuredContent: Elicitation;
} {
  const message = "What pattern are you looking for? Please provide a search query.";
  
  // CANONICAL: Structured content delivered via JSON content block (MCP-supported surface)
  const structuredContent: Elicitation = {
    kind: "needsInput:v1",
    type: "elicitation",
    message,
    needsInput: {
      fields: ["q"],
      reason: "Search query is required to find relevant patterns",
      suggestions: {
        q: [
          "error handling",
          "service pattern",
          "concurrency",
          "resource management",
        ],
      },
    },
  };
  
  const jsonContent = JSON.parse(JSON.stringify(structuredContent)); // Ensure JSON-serializable (removes undefined)
  
  return {
    content: [
      createTextBlock(`## Search Query Needed\n\n${message}`, {
        priority: 1,
        audience: ["user"],
      }),
    ],
    structuredContent: jsonContent, // CANONICAL: Delivered via structuredContent field, not content array
  };
}

/**
 * Create an elicitation response for too-broad search results
 */
export function elicitSearchFilters(
  resultCount: number,
  availableCategories?: string[],
  availableDifficulties?: string[]
): {
  content: TextContent[];
  structuredContent: Elicitation;
} {
  const message = `Found ${resultCount} patterns. Would you like to narrow your search by category or difficulty?`;
  
  const categoryOptions = availableCategories?.map((cat) => ({
    label: cat,
    value: cat,
    description: `Filter by ${cat} category`,
  })) || [];
  
  const difficultyOptions = availableDifficulties?.map((diff) => ({
    label: diff,
    value: diff,
    description: `Filter by ${diff} difficulty`,
  })) || [];
  
  const options = [
    ...categoryOptions.map((opt) => ({ ...opt, field: "category" })),
    ...difficultyOptions.map((opt) => ({ ...opt, field: "difficulty" })),
  ];

  const suggestions: Record<string, string[]> = {};
  if (availableCategories && availableCategories.length > 0) {
    suggestions.category = availableCategories;
  }
  if (availableDifficulties && availableDifficulties.length > 0) {
    suggestions.difficulty = availableDifficulties;
  }

  // CANONICAL: Structured content delivered via JSON content block (MCP-supported surface)
  const structuredContent: Elicitation = {
    kind: "needsInput:v1",
    type: "elicitation",
    message,
    needsInput: {
      fields: ["category", "difficulty"],
      reason: `Too many results (${resultCount}). Narrowing filters will help find the right pattern.`,
      suggestions: Object.keys(suggestions).length > 0 ? suggestions : undefined,
    },
    options: options.length > 0 ? options : undefined,
  };
  
  const jsonContent = JSON.parse(JSON.stringify(structuredContent)); // Ensure JSON-serializable (removes undefined)
  
  return {
    content: [
      createTextBlock(`## Narrow Your Search\n\n${message}\n\n**Available filters:**\n- Category: ${availableCategories?.join(", ") || "any"}\n- Difficulty: ${availableDifficulties?.join(", ") || "any"}`, {
        priority: 1,
        audience: ["user"],
      }),
    ],
    structuredContent: jsonContent, // CANONICAL: Delivered via structuredContent field, not content array
  };
}

/**
 * Create an elicitation response for invalid pattern ID
 */
export function elicitPatternId(
  invalidId: string,
  suggestions?: string[]
): {
  content: TextContent[];
  structuredContent: Elicitation;
} {
  const message = `Pattern "${invalidId}" not found. Please provide a valid pattern ID.`;
  
  // CANONICAL: Structured content delivered via JSON content block (MCP-supported surface)
  const structuredContent: Elicitation = {
    kind: "needsInput:v1",
    type: "elicitation",
    message,
    needsInput: {
      fields: ["id"],
      reason: `Pattern ID "${invalidId}" is invalid or does not exist`,
      suggestions: suggestions && suggestions.length > 0 ? { id: suggestions } : undefined,
    },
    options: suggestions?.map((s) => ({
      label: s,
      value: s,
      description: `Pattern ID: ${s}`,
      field: "id",
    })),
  };
  
  const jsonContent = JSON.parse(JSON.stringify(structuredContent)); // Ensure JSON-serializable (removes undefined)
  
  return {
    content: [
      createTextBlock(`## Pattern Not Found\n\n${message}${suggestions && suggestions.length > 0 ? `\n\n**Did you mean:**\n${suggestions.map((s) => `- \`${s}\``).join("\n")}` : ""}`, {
        priority: 1,
        audience: ["user"],
      }),
    ],
    structuredContent: jsonContent, // CANONICAL: Delivered via structuredContent field, not content array
  };
}

/**
 * Validate search query is not empty or too short
 */
export function isSearchQueryValid(q?: string): boolean {
  if (!q) return false;
  const trimmed = q.trim();
  return trimmed.length >= 1; // At least 1 character
}

/**
 * Threshold for triggering "too broad" elicitation
 * If results exceed this count without filters, suggest narrowing
 */
export const SEARCH_TOO_BROAD_THRESHOLD = 20;

/**
 * Check if search results are too broad (need filtering)
 */
export function isSearchTooBroad(count: number, hasFilters: boolean): boolean {
  // If no filters applied and results > threshold, suggest filtering
  return !hasFilters && count > SEARCH_TOO_BROAD_THRESHOLD;
}
