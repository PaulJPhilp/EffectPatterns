#!/usr/bin/env node
/**
 * Production MCP Client - HTTP Transport
 *
 * Connects to the production Effect Patterns MCP server via HTTP API
 * and provides MCP stdio interface for Windsurf.
 *
 * This is a PURE TRANSPORT layer - all authentication and authorization
 * happens at the HTTP API level.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Configuration
const PRODUCTION_URL = "https://effect-patterns-mcp.vercel.app";
const API_KEY = process.env.PATTERN_API_KEY || process.env.PRODUCTION_API_KEY;

// Create MCP server
const server = new McpServer(
    {
        name: "effect-patterns-production",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    },
);

/**
 * API call result - errors as values, not exceptions.
 */
type ApiResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; status?: number };

/**
 * Helper to make HTTP requests to production API.
 * Returns Result type - no exceptions thrown.
 */
async function callProductionApi(endpoint: string, data?: unknown): Promise<ApiResult<unknown>> {
    const url = `${PRODUCTION_URL}/api${endpoint}`;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (API_KEY) {
        headers["x-api-key"] = API_KEY;
    }

    try {
        const response = await fetch(url, {
            method: data ? "POST" : "GET",
            headers,
            body: data ? JSON.stringify(data) : undefined,
        });

        if (!response.ok) {
            const errorText = await response.text();
            return {
                ok: false,
                error: errorText || `HTTP ${response.status}`,
                status: response.status,
            };
        }

        const result = await response.json();
        return { ok: true, data: result };
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return { ok: false, error: msg };
    }
}

/**
 * Tool result type
 */
type ToolResult = {
    content: Array<{ type: "text"; text: string }>;
    isError?: boolean;
};

/**
 * Convert API result to tool result
 */
function toToolResult(result: ApiResult<unknown>, toolName: string): ToolResult {
    if (result.ok) {
        return {
            content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }],
        };
    }

    console.error(`Tool error: ${toolName}`, result.error);
    return {
        content: [{ type: "text", text: result.error }],
        isError: true,
    };
}

// Register tools based on production API
// Note: `as any` is required for MCP SDK compatibility - inputSchema format differs
server.registerTool(
    "analyze_code",
    {
        description:
            "Analyze TypeScript code for Effect-TS patterns and best practices",
        inputSchema: undefined as any,
    },
    async (args: { code: string; filename?: string; analysisType?: string }): Promise<ToolResult> => {
        console.error("Tool called: analyze_code", args);
        const result = await callProductionApi("/analyze-code", {
            code: args.code,
        });
        return toToolResult(result, "analyze_code");
    },
);

server.registerTool(
    "list_patterns",
    {
        description: "List available Effect-TS patterns",
        inputSchema: undefined as any,
    },
    async (args: { q?: string; category?: string; difficulty?: string; limit?: number }): Promise<ToolResult> => {
        console.error("Tool called: list_patterns", args);
        const searchParams = new URLSearchParams();
        if (args.q) searchParams.append("q", args.q);
        if (args.category) searchParams.append("category", args.category);
        if (args.difficulty) searchParams.append("difficulty", args.difficulty);
        if (args.limit) searchParams.append("limit", String(args.limit));

        const endpoint = searchParams.toString()
            ? `/patterns?${searchParams}`
            : `/patterns`;
        const result = await callProductionApi(endpoint);
        return toToolResult(result, "list_patterns");
    },
);

server.registerTool(
    "review_code",
    {
        description: "Get AI-powered architectural review and diagnostic recommendations for Effect code. Only accepts code that is cut and pasted into the prompt or provided from an open editor file. Returns diagnostic information only (no corrected code).",
        inputSchema: undefined as any,
    },
    async (args: { code: string; filePath?: string }): Promise<ToolResult> => {
        console.error("Tool called: review_code", args);
        // Note: This tool only accepts code that is cut and pasted or from open editor.
        // Files are NOT read from disk. Only diagnostics are returned.
        const result = await callProductionApi("/review-code", {
            code: args.code,
            filePath: args.filePath,
        });
        return toToolResult(result, "review_code");
    },
);

server.registerTool(
    "get_pattern",
    {
        description: "Get details for a specific pattern by ID",
        inputSchema: undefined as any,
    },
    async (args: { id: string }): Promise<ToolResult> => {
        console.error("Tool called: get_pattern", args);
        const result = await callProductionApi(`/patterns/${args.id}`);
        return toToolResult(result, "get_pattern");
    },
);

// Start the server
async function main() {
    // Warn if no API key - auth happens at HTTP API level
    if (!API_KEY) {
        console.error(
            "[Effect Patterns MCP] No API key configured. " +
                "Requests will fail if HTTP API requires authentication."
        );
    }

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[Effect Patterns MCP] Production client started successfully");
}

main().catch((error) => {
    console.error("[Effect Patterns MCP] Fatal error:", error);
    process.exit(1);
});
