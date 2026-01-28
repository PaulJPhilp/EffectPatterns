/**
 * Zod Schemas for MCP Tools
 *
 * This file contains Zod schema definitions for proper MCP compliance and validation.
 */

import { z } from "zod";

// Tool schema definitions
export const ToolSchemas = {
  // Search Patterns Tool
  searchPatterns: z.object({
    q: z.string().optional().describe("Search query string. Empty string will trigger elicitation."),
    category: z
      .enum(["validation", "service", "error-handling", "composition", "concurrency", "streams", "resource", "scheduling"])
      .optional()
      .describe("Pattern category filter"),
    difficulty: z
      .enum(["beginner", "intermediate", "advanced"])
      .optional()
      .describe("Difficulty level filter"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Maximum number of results to return"),
    format: z
      .enum(["json", "markdown", "both"])
      .default("markdown")
      .optional()
      .describe("Output format (default: 'markdown')"),
    limitCards: z
      .number()
      .int()
      .min(1)
      .max(10)
      .default(10)
      .optional()
      .describe("Maximum number of cards to render in markdown (default: 10)"),
    includeProvenancePanel: z
      .boolean()
      .default(false)
      .optional()
      .describe("Include provenance information panel (default: false)"),
    includeStructuredPatterns: z
      .boolean()
      .optional()
      .describe("Include full patterns array in structuredContent (default: false for markdown-only)"),
  }).describe("Search Effect-TS patterns by query, category, difficulty level, and more"),

  // Get Pattern Tool
  getPattern: z.object({
    id: z.string().describe("Pattern identifier (e.g., 'effect-service'). Empty string will trigger elicitation."),
    format: z
      .enum(["json", "markdown", "both"])
      .default("markdown")
      .optional()
      .describe("Output format (default: 'markdown')"),
    includeStructuredDetails: z
      .boolean()
      .optional()
      .describe("Include full structuredContent details (default: false for markdown-only)"),
  }).describe("Get full details for a specific pattern by ID"),

  // List Analysis Rules Tool
  listAnalysisRules: z.object({}).describe("List all available code analysis rules for anti-pattern detection"),

  // Analyze Code Tool
  analyzeCode: z.object({
    source: z.string().min(1).describe("TypeScript source code to analyze"),
    filename: z.string().optional().describe("Filename for context (e.g., 'service.ts')"),
    analysisType: z
      .enum(["validation", "patterns", "errors", "all"])
      .default("all")
      .describe("Type of analysis to perform"),
  }).describe("Analyze TypeScript code for Effect-TS anti-patterns and best practices violations"),

  // Review Code Tool
  reviewCode: z.object({
    code: z.string().min(1).describe("Source code to review (must be cut and pasted from prompt or provided from open editor)"),
    filePath: z.string().optional().describe("File path for context only (e.g., 'src/services/user.ts'). Code must be provided via 'code' parameter - files are not read from disk."),
  }).describe("Get AI-powered architectural review and diagnostic recommendations for Effect code. Only accepts code that is cut and pasted into the prompt or provided from an open editor file. Returns diagnostic information only (no corrected code)."),

  // Debug MCP Config Tool
  getMcpConfig: z.object({
    format: z
      .enum(["json", "markdown", "both"])
      .default("markdown")
      .optional()
      .describe("Output format (default: 'markdown')"),
  }).describe("Get MCP server config (base URL, env, and api-key presence) for debugging"),

  // Paid-tier schemas removed from MCP tool surface (HTTP API only)
};

// Type exports for TypeScript integration
export type SearchPatternsArgs = z.infer<typeof ToolSchemas.searchPatterns>;
export type GetPatternArgs = z.infer<typeof ToolSchemas.getPattern>;
export type ListAnalysisRulesArgs = z.infer<typeof ToolSchemas.listAnalysisRules>;
export type AnalyzeCodeArgs = z.infer<typeof ToolSchemas.analyzeCode>;
export type ReviewCodeArgs = z.infer<typeof ToolSchemas.reviewCode>;
export type GetMcpConfigArgs = z.infer<typeof ToolSchemas.getMcpConfig>;
