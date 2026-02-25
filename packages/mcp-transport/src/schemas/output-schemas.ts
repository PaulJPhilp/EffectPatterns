/**
 * Output Schemas for MCP Tools
 *
 * Defines Zod schemas for structured tool outputs.
 * These schemas describe the machine-readable payload structure
 * that accompanies the human-readable markdown presentation.
 */

import { z } from "zod";

// ============================================================================
// Pattern Summary Schema (used in search results)
// ============================================================================

export const PatternSummarySchema = z.object({
  id: z.string().describe("Pattern identifier (slug)"),
  title: z.string().describe("Pattern title"),
  category: z.string().describe("Pattern category"),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).describe("Difficulty level"),
  description: z.string().describe("Pattern description (truncated to ~200 chars for search results)"),
  tags: z.array(z.string()).optional().describe("Pattern tags"),
  // Note: examples, useCases, relatedPatterns omitted from search results
  // Use get_pattern for full details
});

export type PatternSummary = z.infer<typeof PatternSummarySchema>;

// ============================================================================
// Search Results Output Schema
// ============================================================================

export const SearchResultsOutputSchema = z.object({
  kind: z.literal("patternSearchResults:v1").describe("Response type discriminator"),
  query: z.object({
    q: z.string().optional().describe("Search query string"),
    category: z.string().optional().describe("Category filter"),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional().describe("Difficulty filter"),
    limit: z.number().optional().describe("Result limit"),
    format: z.enum(["markdown", "json", "both"]).optional().describe("Resolved output format"),
  }).describe("Query parameters echo (only includes provided values)"),
  metadata: z.object({
    totalCount: z.number().describe("Total number of matching patterns"),
    categories: z.record(z.string(), z.number()).optional().describe("Count per category"),
    difficulties: z.record(z.string(), z.number()).optional().describe("Count per difficulty"),
    renderedCards: z.number().describe("Number of cards rendered in markdown"),
    renderedCardIds: z.array(z.string()).describe("IDs of patterns rendered as cards (in order)"),
    contractMarkers: z.object({
      index: z.number().describe("Number of pattern index markers"),
      cards: z.number().describe("Number of pattern card markers"),
      version: z.string().describe("Marker version (e.g., 'v1')"),
    }).describe("Presentation contract markers"),
  }).describe("Search result metadata"),
  patterns: z.array(PatternSummarySchema).describe("List of ALL matching patterns (not just rendered cards)"),
  provenance: z.object({
    source: z.string().describe("Data source identifier"),
    timestamp: z.string().describe("ISO timestamp"),
    version: z.string().optional().describe("API version"),
  }).optional().describe("Provenance information"),
});

export type SearchResultsOutput = z.infer<typeof SearchResultsOutputSchema>;

// ============================================================================
// Pattern Details Output Schema
// ============================================================================

export const PatternDetailsOutputSchema = z.object({
  kind: z.literal("patternDetails:v1").describe("Response type discriminator"),
  id: z.string().describe("Pattern identifier"),
  title: z.string().describe("Pattern title"),
  category: z.string().describe("Pattern category"),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).describe("Difficulty level"),
  summary: z.string().describe("Brief summary"),
  description: z.string().describe("Full description"),
  tags: z.array(z.string()).optional().describe("Pattern tags"),
  useGuidance: z.object({
    useWhen: z.string().optional().describe("When to use this pattern"),
    avoidWhen: z.string().optional().describe("When to avoid this pattern"),
  }).optional().describe("Usage guidance"),
  sections: z.array(z.object({
    title: z.string(),
    content: z.string(),
    type: z.enum(["description", "example", "useCase", "related"]).optional(),
  })).optional().describe("Content sections"),
  examples: z.array(z.object({
    code: z.string(),
    language: z.string().optional().default("typescript"),
    description: z.string().optional(),
  })).optional().describe("Code examples"),
  provenance: z.object({
    source: z.string().describe("Data source identifier"),
    timestamp: z.string().describe("ISO timestamp"),
    version: z.string().optional().describe("API version"),
    marker: z.string().optional().describe("Contract marker version"),
  }).optional().describe("Provenance information"),
});

export type PatternDetailsOutput = z.infer<typeof PatternDetailsOutputSchema>;

// ============================================================================
// Elicitation Schema
// ============================================================================

export const ElicitationSchema = z.object({
  kind: z.literal("needsInput:v1").describe("Response type discriminator"),
  type: z.literal("elicitation").describe("Elicitation request type"),
  message: z.string().describe("Human-readable prompt for missing input"),
  needsInput: z.object({
    fields: z.array(z.string()).describe("Field names that need input"),
    reason: z.string().describe("Why input is needed"),
    suggestions: z.record(z.string(), z.array(z.string())).optional().describe("Suggested values grouped by field"),
  }).optional().describe("Structured input requirements"),
  options: z.array(z.object({
    label: z.string(),
    value: z.string(),
    description: z.string().optional(),
    field: z.string().optional().describe("Field this option applies to"),
  })).optional().describe("Available options for selection (grouped by field when applicable)"),
});

export type Elicitation = z.infer<typeof ElicitationSchema>;

// ============================================================================
// Tool Error Schema
// ============================================================================

export const ToolErrorSchema = z.object({
  kind: z.literal("toolError:v1").describe("Response type discriminator"),
  code: z.string().describe("Error code (e.g., 'NETWORK_ERROR', 'VALIDATION_ERROR', 'SERVER_ERROR')"),
  message: z.string().describe("Human-readable error message"),
  retryable: z.boolean().optional().describe("Whether the operation can be retried"),
  details: z.record(z.string(), z.unknown()).optional().describe("Additional error details"),
});

export type ToolError = z.infer<typeof ToolErrorSchema>;

// ============================================================================
// Union Schema: All Structured Content Types
// ============================================================================

/**
 * Discriminated union of all structured content types.
 * Use this to validate any tool's structuredContent field.
 * 
 * This prevents drift as new tool response types are added.
 */
export const ToolStructuredContentSchema = z.discriminatedUnion("kind", [
  SearchResultsOutputSchema,
  PatternDetailsOutputSchema,
  ElicitationSchema,
  ToolErrorSchema,
]);

export type ToolStructuredContent = z.infer<typeof ToolStructuredContentSchema>;
