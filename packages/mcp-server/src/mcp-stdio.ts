#!/usr/bin/env node
/**
 * Effect Patterns MCP Server - Stdio Transport
 *
 * Provides Model Context Protocol (MCP) interface for the Effect Patterns API.
 * Allows Claude Code IDE and other MCP clients to access pattern tools via stdio.
 *
 * Usage:
 *   PATTERN_API_KEY=xxx node dist/mcp-stdio.js
 *
 * Environment Variables:
 *   - PATTERN_API_KEY: Required. API key for accessing the patterns API
 *   - EFFECT_PATTERNS_API_URL: Optional. Base URL for patterns API (default: http://localhost:3000)
 *   - MCP_DEBUG: Optional. Enable debug logging (default: false)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = process.env.EFFECT_PATTERNS_API_URL || "http://localhost:3000";
const API_KEY = process.env.PATTERN_API_KEY;
const DEBUG = process.env.MCP_DEBUG === "true";

// ============================================================================
// Logging
// ============================================================================

function log(message: string, data?: unknown) {
  if (DEBUG) {
    console.error(`[MCP] ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }
}

// ============================================================================
// API Client
// ============================================================================

async function callApi(endpoint: string, method: "GET" | "POST" = "GET", data?: unknown) {
  if (!API_KEY) {
    throw new Error("PATTERN_API_KEY environment variable is required");
  }

  const url = `${API_BASE_URL}/api${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
  };

  if (data && method === "POST") {
    options.body = JSON.stringify(data);
  }

  log(`API ${method} ${endpoint}`, data);

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const result = await response.json();
    log(`API Response`, result);
    return result;
  } catch (error) {
    log(`API Error`, error);
    throw error;
  }
}

// ============================================================================
// MCP Server Setup
// ============================================================================

const server = new McpServer(
  {
    name: "effect-patterns",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// ============================================================================
// Tool Handlers
// ============================================================================

// Register each tool with the server
server.registerTool(
  "search_patterns",
  {
    description:
      "Search Effect-TS patterns by query, category, difficulty level, and more. Returns matching pattern summaries with basic info.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Search query (e.g., 'error handling', 'async')" },
        category: { type: "string", description: "Pattern category filter" },
        difficulty: {
          type: "string",
          enum: ["beginner", "intermediate", "advanced"],
          description: "Difficulty level filter",
        },
        limit: {
          type: "number",
          default: 20,
          minimum: 1,
          maximum: 100,
          description: "Maximum number of results to return",
        },
      },
    },
  },
  async (args) => {
    log("Tool called: search_patterns", args);
    try {
      const searchParams = new URLSearchParams();
      if (args.q) searchParams.append("q", args.q);
      if (args.category) searchParams.append("category", args.category);
      if (args.difficulty) searchParams.append("difficulty", args.difficulty);
      if (args.limit) searchParams.append("limit", String(args.limit));
      const result = await callApi(`/patterns?${searchParams}`);
      return {
        type: "text",
        text: JSON.stringify(result, null, 2),
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log("Tool error: search_patterns", msg);
      throw new Error(`search_patterns failed: ${msg}`);
    }
  }
);

server.registerTool(
  "get_pattern",
  {
    description: "Get full details for a specific pattern by ID. Returns complete pattern documentation and code examples.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Pattern identifier (e.g., 'effect-service')" },
      },
      required: ["id"],
    },
  },
  async (args) => {
    log("Tool called: get_pattern", args);
    try {
      const result = await callApi(`/patterns/${encodeURIComponent(args.id)}`);
      return {
        type: "text",
        text: JSON.stringify(result, null, 2),
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log("Tool error: get_pattern", msg);
      throw new Error(`get_pattern failed: ${msg}`);
    }
  }
);

server.registerTool(
  "list_analysis_rules",
  {
    description: "List all available code analysis rules for anti-pattern detection. Useful for understanding what patterns are detected.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  async () => {
    log("Tool called: list_analysis_rules");
    try {
      const result = await callApi("/list-rules", "POST", {});
      return {
        type: "text",
        text: JSON.stringify(result, null, 2),
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log("Tool error: list_analysis_rules", msg);
      throw new Error(`list_analysis_rules failed: ${msg}`);
    }
  }
);

server.registerTool(
  "analyze_code",
  {
    description: "Analyze TypeScript code for Effect-TS anti-patterns, best practices violations, and code quality issues. Returns findings with severity levels.",
    inputSchema: {
      type: "object",
      properties: {
        source: { type: "string", description: "TypeScript source code to analyze" },
        filename: { type: "string", description: "Filename for context (e.g., 'service.ts')" },
        analysisType: {
          type: "string",
          enum: ["validation", "patterns", "errors", "all"],
          default: "all",
          description: "Type of analysis to perform",
        },
      },
      required: ["source"],
    },
  },
  async (args) => {
    log("Tool called: analyze_code", args);
    try {
      const result = await callApi("/analyze-code", "POST", {
        source: args.source,
        filename: args.filename,
        analysisType: args.analysisType || "all",
      });
      return {
        type: "text",
        text: JSON.stringify(result, null, 2),
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log("Tool error: analyze_code", msg);
      throw new Error(`analyze_code failed: ${msg}`);
    }
  }
);

server.registerTool(
  "review_code",
  {
    description: "Get AI-powered architectural review and recommendations for Effect code (free tier). Returns top 3 high-impact suggestions.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Source code to review" },
        filePath: { type: "string", description: "File path for context (e.g., 'src/services/user.ts')" },
      },
      required: ["code"],
    },
  },
  async (args) => {
    log("Tool called: review_code", args);
    try {
      const result = await callApi("/review-code", "POST", {
        code: args.code,
        filePath: args.filePath,
      });
      return {
        type: "text",
        text: JSON.stringify(result, null, 2),
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log("Tool error: review_code", msg);
      throw new Error(`review_code failed: ${msg}`);
    }
  }
);

server.registerTool(
  "generate_pattern_code",
  {
    description: "Generate customized code from a pattern template. Supports variable substitution for names and configurations.",
    inputSchema: {
      type: "object",
      properties: {
        patternId: { type: "string", description: "Pattern template ID (e.g., 'effect-service', 'error-handler')" },
        variables: {
          type: "object",
          description: "Variables for template substitution (key-value pairs)",
          additionalProperties: { type: "string" },
        },
      },
      required: ["patternId"],
    },
  },
  async (args) => {
    log("Tool called: generate_pattern_code", args);
    try {
      const result = await callApi("/generate-pattern", "POST", {
        patternId: args.patternId,
        variables: args.variables || {},
      });
      return {
        type: "text",
        text: JSON.stringify(result, null, 2),
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log("Tool error: generate_pattern_code", msg);
      throw new Error(`generate_pattern_code failed: ${msg}`);
    }
  }
);

server.registerTool(
  "analyze_consistency",
  {
    description: "Detect inconsistencies and anti-patterns across multiple TypeScript files. Useful for large refactoring projects.",
    inputSchema: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: {
            type: "object",
            properties: {
              filename: { type: "string", description: "File path" },
              source: { type: "string", description: "File source code" },
            },
            required: ["filename", "source"],
          },
          description: "Files to analyze",
        },
      },
      required: ["files"],
    },
  },
  async (args) => {
    log("Tool called: analyze_consistency", args);
    try {
      const result = await callApi("/analyze-consistency", "POST", {
        files: args.files,
      });
      return {
        type: "text",
        text: JSON.stringify(result, null, 2),
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log("Tool error: analyze_consistency", msg);
      throw new Error(`analyze_consistency failed: ${msg}`);
    }
  }
);

server.registerTool(
  "apply_refactoring",
  {
    description: "Apply automated refactoring patterns to code. Supports preview mode for safe preview before applying changes.",
    inputSchema: {
      type: "object",
      properties: {
        refactoringIds: {
          type: "array",
          items: { type: "string" },
          description: "List of refactoring IDs to apply",
        },
        files: {
          type: "array",
          items: {
            type: "object",
            properties: {
              filename: { type: "string", description: "File path" },
              source: { type: "string", description: "File source code" },
            },
            required: ["filename", "source"],
          },
          description: "Files to refactor",
        },
        preview: {
          type: "boolean",
          default: true,
          description: "Preview changes without applying (safe default)",
        },
      },
      required: ["refactoringIds", "files"],
    },
  },
  async (args) => {
    log("Tool called: apply_refactoring", args);
    try {
      const result = await callApi("/apply-refactoring", "POST", {
        refactoringIds: args.refactoringIds,
        files: args.files,
        preview: args.preview !== false,
      });
      return {
        type: "text",
        text: JSON.stringify(result, null, 2),
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log("Tool error: apply_refactoring", msg);
      throw new Error(`apply_refactoring failed: ${msg}`);
    }
  }
);

// ============================================================================
// Server Startup
// ============================================================================

async function main() {
  // Validate environment
  if (!API_KEY) {
    console.error("Error: PATTERN_API_KEY environment variable is required");
    console.error("Usage: PATTERN_API_KEY=xxx npm run mcp");
    process.exit(1);
  }

  log("Starting MCP server", {
    apiUrl: API_BASE_URL,
    debug: DEBUG,
  });

  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    log("MCP server connected via stdio");
    console.error("[Effect Patterns MCP] Server started successfully");
  } catch (error) {
    console.error("[Effect Patterns MCP] Failed to start:", error);
    process.exit(1);
  }
}

// Handle signals gracefully
process.on("SIGINT", () => {
  log("Received SIGINT, shutting down");
  process.exit(0);
});

process.on("SIGTERM", () => {
  log("Received SIGTERM, shutting down");
  process.exit(0);
});

main().catch((error) => {
  console.error("[Effect Patterns MCP] Fatal error:", error);
  process.exit(1);
});
