import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ToolSchemas } from "../schemas/tool-schemas.js";

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
 * Function type for calling the internal API.
 */
export type CallApiFn = (
  endpoint: string,
  method?: "GET" | "POST",
  data?: unknown
) => Promise<any>;

/**
 * Function type for logging.
 */
export type LogFn = (message: string, data?: unknown) => void;

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
  server.tool(
    "search_patterns",
    "Search Effect-TS patterns by query, category, difficulty level, and more",
    ToolSchemas.searchPatterns.shape as any,
    async (args: any): Promise<CallToolResult> => {
      log("Tool called: search_patterns", args);
      try {
        const searchParams = new URLSearchParams();
        if (args.q) searchParams.append("q", args.q);
        if (args.category) searchParams.append("category", args.category);
        if (args.difficulty) searchParams.append("difficulty", args.difficulty);
        if (args.limit) searchParams.append("limit", String(args.limit));

        const result = await callApi(`/patterns?${searchParams}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        log("Tool error: search_patterns", msg);
        throw new Error(msg);
      }
    }
  );

  // Get Pattern Tool
  server.tool(
    "get_pattern",
    "Get full details for a specific pattern by ID",
    ToolSchemas.getPattern.shape as any,
    async (args: any): Promise<CallToolResult> => {
      log("Tool called: get_pattern", args);
      try {
        const result = await callApi(`/patterns/${encodeURIComponent(args.id)}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        log("Tool error: get_pattern", msg);
        throw new Error(msg);
      }
    }
  );

  // List Analysis Rules Tool
  server.tool(
    "list_analysis_rules",
    "List all available code analysis rules for anti-pattern detection",
    ToolSchemas.listAnalysisRules.shape as any,
    async (args: any): Promise<CallToolResult> => {
      log("Tool called: list_analysis_rules", args);
      try {
        const result = await callApi("/list-rules", "POST", {});
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        log("Tool error: list_analysis_rules", msg);
        throw new Error(msg);
      }
    }
  );

  // Analyze Code Tool
  server.tool(
    "analyze_code",
    "Analyze TypeScript code for Effect-TS anti-patterns and best practices violations",
    ToolSchemas.analyzeCode.shape as any,
    async (args: any): Promise<CallToolResult> => {
      log("Tool called: analyze_code", args);
      try {
        const result = await callApi("/analyze-code", "POST", {
          source: args.source,
          filename: args.filename,
          analysisType: args.analysisType || "all",
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        log("Tool error: analyze_code", msg);
        throw new Error(msg);
      }
    }
  );

  // Review Code Tool
  server.tool(
    "review_code",
    "Get AI-powered architectural review and recommendations for Effect code",
    ToolSchemas.reviewCode.shape as any,
    async (args: any): Promise<CallToolResult> => {
      log("Tool called: review_code", args);
      try {
        const result = await callApi("/review-code", "POST", {
          code: args.code,
          filePath: args.filePath,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        log("Tool error: review_code", msg);
        throw new Error(msg);
      }
    }
  );

  // Generate Pattern Code Tool
  server.tool(
    "generate_pattern_code",
    "Generate customized code from a pattern template",
    ToolSchemas.generatePatternCode.shape as any,
    async (args: any): Promise<CallToolResult> => {
      log("Tool called: generate_pattern_code", args);
      try {
        const result = await callApi("/generate-pattern", "POST", {
          patternId: args.patternId,
          variables: args.variables || {},
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        log("Tool error: generate_pattern_code", msg);
        throw new Error(msg);
      }
    }
  );

  // Analyze Consistency Tool
  server.tool(
    "analyze_consistency",
    "Detect inconsistencies and anti-patterns across multiple TypeScript files",
    ToolSchemas.analyzeConsistency.shape as any,
    async (args: any): Promise<CallToolResult> => {
      log("Tool called: analyze_consistency", args);
      try {
        const result = await callApi("/analyze-consistency", "POST", {
          files: args.files,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        log("Tool error: analyze_consistency", msg);
        throw new Error(msg);
      }
    }
  );

  // Apply Refactoring Tool
  server.tool(
    "apply_refactoring",
    "Apply automated refactoring patterns to code",
    ToolSchemas.applyRefactoring.shape as any,
    async (args: any): Promise<CallToolResult> => {
      log("Tool called: apply_refactoring", args);
      try {
        const result = await callApi("/apply-refactoring", "POST", {
          refactoringIds: args.refactoringIds,
          files: args.files,
          preview: args.preview !== false,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        log("Tool error: apply_refactoring", msg);
        throw new Error(msg);
      }
    }
  );
}