import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ToolSchemas,
  type SearchPatternsArgs,
  type GetPatternArgs,
  type AnalyzeCodeArgs,
  type ReviewCodeArgs,
} from "../schemas/tool-schemas.js";

/**
 * Result of a tool execution.
 */
export type CallToolResult = {
  content: Array<{
    type: "text";
    text: string;
  }>;
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
 * Helper to convert API result to tool result.
 */
function toToolResult(result: ApiResult<unknown>, toolName: string, log: LogFn): CallToolResult {
  if (result.ok) {
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

  // Get Pattern Tool
  // Note: `as any` is required for MCP SDK compatibility - Zod schemas need conversion
  server.tool(
    "get_pattern",
    "Get full details for a specific pattern by ID",
    ToolSchemas.getPattern.shape as any,
    async (args: GetPatternArgs): Promise<CallToolResult> => {
      log("Tool called: get_pattern", args);
      const result = await callApi(`/patterns/${encodeURIComponent(args.id)}`);
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
  server.tool(
    "review_code",
    "Get AI-powered architectural review and recommendations for Effect code",
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