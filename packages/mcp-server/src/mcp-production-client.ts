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
import { Agent as HttpsAgent } from "https";

// Configuration
const PRODUCTION_URL = "https://effect-patterns-mcp.vercel.app";
const API_KEY = process.env.PATTERN_API_KEY || process.env.PRODUCTION_API_KEY;
const REQUEST_TIMEOUT_MS = 30000;
const MCP_SERVER_VERSION = "2.0.0";

// HTTP Connection Pooling (production API is always HTTPS)
const httpsAgent = new HttpsAgent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: REQUEST_TIMEOUT_MS,
});

/**
 * In-flight request deduping
 */
const inFlightRequests = new Map<
  string,
  Promise<ApiResult<unknown>>
>();

// Create MCP server
const server = new McpServer(
    {
        name: "effect-patterns-production",
        version: MCP_SERVER_VERSION,
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
    | { ok: false; error: string; status?: number; details?: {
        errorName?: string;
        errorType?: string;
        cause?: string;
        retryable?: boolean;
        apiHost?: string;
        hasApiKey?: boolean;
    } };

/**
 * Helper to make HTTP requests to production API.
 * Returns Result type - no exceptions thrown.
 * Features: connection pooling, keep-alive, timeout, deduping
 */
async function callProductionApi(endpoint: string, data?: unknown): Promise<ApiResult<unknown>> {
    const url = `${PRODUCTION_URL}/api${endpoint}`;
    const requestKey = `${data ? "POST" : "GET"}:${endpoint}:${data ? JSON.stringify(data) : ""}`;

    // Check for in-flight request (dedupe)
    const inFlight = inFlightRequests.get(requestKey);
    if (inFlight) {
        console.error(`[MCP] Dedupe hit: ${requestKey}`);
        return inFlight;
    }

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (API_KEY) {
        headers["x-api-key"] = API_KEY;
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, REQUEST_TIMEOUT_MS);

    const requestPromise = (async (): Promise<ApiResult<unknown>> => {
        try {
            const response = await fetch(url, {
                method: data ? "POST" : "GET",
                headers,
                body: data ? JSON.stringify(data) : undefined,
                signal: controller.signal,
                // @ts-expect-error - Node.js fetch supports agent option
                agent: httpsAgent,
            });

            clearTimeout(timeoutId);

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
            clearTimeout(timeoutId);
            
            if (error instanceof Error && error.name === "AbortError") {
                return { 
                    ok: false, 
                    error: `Request timeout after ${REQUEST_TIMEOUT_MS}ms`,
                    details: {
                        errorName: "AbortError",
                        errorType: "timeout",
                        retryable: true,
                    }
                };
            }

            // Capture detailed error information
            const errorName = error instanceof Error ? error.name : "Unknown";
            const errorMessage = error instanceof Error ? error.message : String(error);
            const cause = error instanceof Error && "cause" in error && error.cause instanceof Error
                ? error.cause.message
                : undefined;
            
            // Extract API host from URL (safe, no secrets)
            let apiHost: string | undefined;
            try {
                const apiUrl = new URL(PRODUCTION_URL);
                apiHost = apiUrl.host;
            } catch {
                // Invalid URL, skip host extraction
            }
            
            // Classify error type and retryability
            let errorType = "network";
            let retryable = true;
            
            if (errorName === "TypeError" && errorMessage.includes("fetch")) {
                errorType = "fetch_error";
                retryable = true;
            } else if (cause?.includes("ECONNREFUSED") || cause?.includes("ENOTFOUND")) {
                errorType = "connection_refused";
                retryable = true;
            } else if (cause?.includes("ETIMEDOUT") || cause?.includes("timeout")) {
                errorType = "timeout";
                retryable = true;
            } else if (cause?.includes("ECONNRESET")) {
                errorType = "connection_reset";
                retryable = true;
            }

            return { 
                ok: false, 
                error: errorMessage,
                details: {
                    errorName,
                    errorType,
                    cause,
                    retryable,
                    apiHost,
                    hasApiKey: !!API_KEY,
                }
            };
        } finally {
            inFlightRequests.delete(requestKey);
        }
    })();

    // Store in-flight request (GET only to avoid side-effects)
    if (!data) {
        inFlightRequests.set(requestKey, requestPromise);
    }

    return requestPromise;
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

// Register tools based on production API (FREE TIER ONLY)
// Note: `as any` is required for MCP SDK compatibility - inputSchema format differs
//
// Paid tools (analyze_code, review_code, apply_refactoring, analyze_consistency,
// generate_pattern) are available via HTTP API / paid CLI only.

server.registerTool(
    "search_patterns",
    {
        description: "Search Effect-TS patterns by query, category, and difficulty",
        inputSchema: undefined as any,
    },
    async (args: { q?: string; category?: string; difficulty?: string; limit?: number }): Promise<ToolResult> => {
        console.error("Tool called: search_patterns", args);
        const searchParams = new URLSearchParams();
        if (args.q) searchParams.append("q", args.q);
        if (args.category) searchParams.append("category", args.category);
        if (args.difficulty) searchParams.append("difficulty", args.difficulty);
        if (args.limit) searchParams.append("limit", String(args.limit));

        const endpoint = searchParams.toString()
            ? `/patterns?${searchParams}`
            : `/patterns`;
        const result = await callProductionApi(endpoint);
        return toToolResult(result, "search_patterns");
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

server.registerTool(
    "list_analysis_rules",
    {
        description: "List all available code analysis rules for anti-pattern detection (read-only catalog)",
        inputSchema: undefined as any,
    },
    async (_args: Record<string, never>): Promise<ToolResult> => {
        console.error("Tool called: list_analysis_rules");
        const result = await callProductionApi("/list-rules");
        return toToolResult(result, "list_analysis_rules");
    },
);

// Start the server
async function main() {
    // One-time startup diagnostic log (always to stderr, no secrets)
    try {
        const apiUrl = new URL(PRODUCTION_URL);
        console.error(
            `[Effect Patterns MCP] API_HOST=${apiUrl.host} HAS_API_KEY=${!!API_KEY}`
        );
    } catch {
        // Fallback if URL parsing fails
        console.error(
            `[Effect Patterns MCP] API_HOST=<invalid> HAS_API_KEY=${!!API_KEY}`
        );
    }

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
