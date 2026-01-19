#!/usr/bin/env node
/**
 * Production MCP Client - HTTP Transport
 *
 * Connects to the production Effect Patterns MCP server via HTTP API
 * and provides MCP stdio interface for Windsurf
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Configuration
const PRODUCTION_URL = "https://effect-patterns-mcp.vercel.app";
const API_KEY =
    process.env.PATTERN_API_KEY ||
    "ce9a3a239f8c028cbf543aa1b77637b8a98ade05814770e4950ff2bb32e9ee84";

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

// Helper to make HTTP requests to production API
async function callProductionApi(endpoint: string, data?: any) {
    const url = `${PRODUCTION_URL}/api${endpoint}`;
    const response = await fetch(url, {
        method: data ? "POST" : "GET",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": API_KEY,
        },
        body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
        throw new Error(
            `API call failed: ${response.status} ${response.statusText}`,
        );
    }

    return response.json();
}

// Register tools based on production API
server.registerTool(
    "analyze_code",
    {
        description:
            "Analyze TypeScript code for Effect-TS patterns and best practices",
        inputSchema: undefined as any,
    },
    async (args: any) => {
        console.error("Tool called: analyze_code", args);
        try {
            const analysis = await callProductionApi("/analyze-code", {
                code: args.code,
            });
            return {
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(analysis, null, 2),
                    },
                ],
            };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error("Tool error: analyze_code", msg);
            throw new Error(`analyze_code failed: ${msg}`);
        }
    },
);

server.registerTool(
    "list_patterns",
    {
        description: "List available Effect-TS patterns",
        inputSchema: undefined as any,
    },
    async (args: any) => {
        console.error("Tool called: list_patterns", args);
        try {
            const searchParams = new URLSearchParams();
            if (args.q) searchParams.append("q", args.q);
            if (args.category) searchParams.append("category", args.category);
            if (args.difficulty) searchParams.append("difficulty", args.difficulty);
            if (args.limit) searchParams.append("limit", String(args.limit));

            const endpoint = searchParams.toString()
                ? `/patterns?${searchParams}`
                : `/patterns`;
            const patterns = await callProductionApi(endpoint);
            return {
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(patterns, null, 2),
                    },
                ],
            };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error("Tool error: list_patterns", msg);
            throw new Error(`list_patterns failed: ${msg}`);
        }
    },
);

server.registerTool(
    "review_code",
    {
        description: "Get AI-powered code review for Effect-TS code",
        inputSchema: undefined as any,
    },
    async (args: any) => {
        console.error("Tool called: review_code", args);
        try {
            const review = await callProductionApi("/review-code", {
                code: args.code,
                filePath: args.filePath,
            });
            return {
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(review, null, 2),
                    },
                ],
            };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error("Tool error: review_code", msg);
            throw new Error(`review_code failed: ${msg}`);
        }
    },
);

server.registerTool(
    "get_pattern",
    {
        description: "Get details for a specific pattern by ID",
        inputSchema: undefined as any,
    },
    async (args: any) => {
        console.error("Tool called: get_pattern", args);
        try {
            const pattern = await callProductionApi(`/patterns/${args.id}`);
            return {
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(pattern, null, 2),
                    },
                ],
            };
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error("Tool error: get_pattern", msg);
            throw new Error(`get_pattern failed: ${msg}`);
        }
    },
);

// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[Effect Patterns MCP] Production client started successfully");
}

main().catch((error) => {
    console.error("[Effect Patterns MCP] Fatal error:", error);
    process.exit(1);
});
