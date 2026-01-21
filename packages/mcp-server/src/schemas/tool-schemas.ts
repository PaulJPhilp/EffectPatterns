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
    q: z.string().min(1).optional().describe("Search query string"),
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
  }).describe("Search Effect-TS patterns by query, category, difficulty level, and more"),

  // Get Pattern Tool
  getPattern: z.object({
    id: z.string().min(1).describe("Pattern identifier (e.g., 'effect-service')"),
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
    code: z.string().min(1).describe("Source code to review"),
    filePath: z.string().optional().describe("File path for context (e.g., 'src/services/user.ts')"),
  }).describe("Get AI-powered architectural review and recommendations for Effect code"),

  // Paid-tier schemas removed from MCP tool surface (HTTP API only)
};

// Type exports for TypeScript integration
export type SearchPatternsArgs = z.infer<typeof ToolSchemas.searchPatterns>;
export type GetPatternArgs = z.infer<typeof ToolSchemas.getPattern>;
export type ListAnalysisRulesArgs = z.infer<typeof ToolSchemas.listAnalysisRules>;
export type AnalyzeCodeArgs = z.infer<typeof ToolSchemas.analyzeCode>;
export type ReviewCodeArgs = z.infer<typeof ToolSchemas.reviewCode>;
