import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TextContent } from "@modelcontextprotocol/sdk/shared/messages.js";
import {
  ToolSchemas,
  type SearchPatternsArgs,
  type GetPatternArgs,
  type AnalyzeCodeArgs,
  type ReviewCodeArgs,
} from "../schemas/tool-schemas.js";
import {
  createTextBlock,
  createCodeBlock,
  buildPatternContent,
  buildScanFirstPatternContent,
} from "../mcp-content-builders.js";
import {
  generateMigrationDiff,
  isMigrationPattern,
} from "../services/pattern-diff-generator/api.js";

/**
 * Result of a tool execution - supports MCP 2.0 rich content arrays
 */
export type CallToolResult = {
  content: (TextContent | { type: "text"; text: string })[];
  isError?: boolean;
};

/**
 * API call result - errors as values, not exceptions.
 */
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

/**
 * Function type for calling the internal API.
 * Returns Result type - no exceptions thrown.
 */
export type CallApiFn = (
  endpoint: string,
  method?: "GET" | "POST",
  data?: unknown
) => Promise<ApiResult<unknown>>;

/**
 * Function type for logging.
 */
export type LogFn = (message: string, data?: unknown) => void;

/**
 * Helper to convert API result to tool result - supports both plain text and rich content.
 */
function toToolResult(
  result: ApiResult<unknown>,
  toolName: string,
  log: LogFn,
  richContent?: (TextContent | { type: "text"; text: string })[]
): CallToolResult {
  if (result.ok) {
    // If rich content provided, use it; otherwise fall back to JSON
    if (richContent && richContent.length > 0) {
      return {
        content: richContent,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(result.data) }],
    };
  }

  // Return error as content with isError flag
  log(`Tool error: ${toolName}`, result.error);
  return {
    content: [{ type: "text", text: result.error }],
    isError: true,
  };
}

/**
 * Registers all Effect Patterns tools with the MCP server.
 * Shared implementation for both Stdio and HTTP transports.
 */
export function registerTools(
  server: McpServer,
  callApi: CallApiFn,
  log: LogFn
): void {
  // Search Patterns Tool
  // Note: `as any` is required for MCP SDK compatibility - Zod schemas need conversion
  server.tool(
    "search_patterns",
    "Search Effect-TS patterns by query, category, difficulty level, and more",
    ToolSchemas.searchPatterns.shape as any,
    async (args: SearchPatternsArgs): Promise<CallToolResult> => {
      log("Tool called: search_patterns", args);
      const searchParams = new URLSearchParams();
      if (args.q) searchParams.append("q", args.q);
      if (args.category) searchParams.append("category", args.category);
      if (args.difficulty) searchParams.append("difficulty", args.difficulty);
      if (args.limit) searchParams.append("limit", String(args.limit));

      const result = await callApi(`/patterns?${searchParams}`);
      return toToolResult(result, "search_patterns", log);
    }
  );

  // Get Pattern Tool - Returns rich content with description and code examples
  // Note: `as any` is required for MCP SDK compatibility - Zod schemas need conversion
  server.tool(
    "get_pattern",
    "Get full details for a specific pattern by ID",
    ToolSchemas.getPattern.shape as any,
    async (args: GetPatternArgs): Promise<CallToolResult> => {
      log("Tool called: get_pattern", args);
      const result = await callApi(`/patterns/${encodeURIComponent(args.id)}`);

      // Check if this is a migration pattern and return annotated diff
      if (result.ok && isMigrationPattern(args.id)) {
        const diffContent = generateMigrationDiff(args.id);
        return {
          content: diffContent,
        };
      }

      // For regular patterns, build scan-first content optimized for quick scanning
      if (result.ok && result.data) {
        const pattern = result.data as any;
        const richContent = buildScanFirstPatternContent({
          title: pattern.title,
          category: pattern.category,
          difficulty: pattern.difficulty,
          description: pattern.description,
          examples: pattern.examples,
          useCases: pattern.useCases,
          tags: pattern.tags,
          relatedPatterns: pattern.relatedPatterns,
        });

        return {
          content: richContent,
        };
      }

      // Fall back to JSON response if not a pattern or error
      return toToolResult(result, "get_pattern", log);
    }
  );

  // List Analysis Rules Tool
  // Note: `as any` is required for MCP SDK compatibility - Zod schemas need conversion
  server.tool(
    "list_analysis_rules",
    "List all available code analysis rules for anti-pattern detection",
    ToolSchemas.listAnalysisRules.shape as any,
    async (_args: Record<string, never>): Promise<CallToolResult> => {
      log("Tool called: list_analysis_rules", args);
      const result = await callApi("/list-rules", "POST", {});
      return toToolResult(result, "list_analysis_rules", log);
    }
  );

  // Analyze Code Tool
  // Note: `as any` is required for MCP SDK compatibility - Zod schemas need conversion
  server.tool(
    "analyze_code",
    "Analyze TypeScript code for Effect-TS anti-patterns and best practices violations",
    ToolSchemas.analyzeCode.shape as any,
    async (args: AnalyzeCodeArgs): Promise<CallToolResult> => {
      log("Tool called: analyze_code", args);
      const result = await callApi("/analyze-code", "POST", {
        source: args.source,
        filename: args.filename,
        analysisType: args.analysisType || "all",
      });
      return toToolResult(result, "analyze_code", log);
    }
  );

  // Review Code Tool
  // Note: `as any` is required for MCP SDK compatibility - Zod schemas need conversion
  // This tool only accepts code that is:
  // 1. Cut and pasted into the prompt (code parameter)
  // 2. Provided from an open editor file (code parameter with optional filePath for context)
  // Files are NOT read from disk. Only diagnostic information is returned (no corrected code).
  server.tool(
    "review_code",
    "Get AI-powered architectural review and diagnostic recommendations for Effect code. Only accepts code that is cut and pasted into the prompt or provided from an open editor file. Returns diagnostic information only (no corrected code).",
    ToolSchemas.reviewCode.shape as any,
    async (args: ReviewCodeArgs): Promise<CallToolResult> => {
      log("Tool called: review_code", args);
      const result = await callApi("/review-code", "POST", {
        code: args.code,
        filePath: args.filePath,
      });
      return toToolResult(result, "review_code", log);
    }
  );

  // NOTE: Paid-tier MCP tools are intentionally not exposed.
  // Paid features are available via HTTP API only.
}