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
            Authorization: `Bearer ${API_KEY}`,
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
        inputSchema: {
            type: "object",
            properties: {
                code: {
                    type: "string",
                    description: "TypeScript code to analyze",
                },
            },
            required: ["code"],
        } as any,
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
        inputSchema: {
            type: "object",
            properties: {
                category: {
                    type: "string",
                    description: "Filter by pattern category (optional)",
                },
            },
        } as any,
    },
    async (args: any) => {
        console.error("Tool called: list_patterns", args);
        try {
            const patterns = await callProductionApi("/patterns", {
                category: args.category,
            });
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
        inputSchema: {
            type: "object",
            properties: {
                code: {
                    type: "string",
                    description: "TypeScript code to review",
                },
            },
            required: ["code"],
        } as any,
    },
    async (args: any) => {
        console.error("Tool called: review_code", args);
        try {
            const review = await callProductionApi("/review-code", {
                code: args.code,
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

// Start server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Production MCP client started");
}

main().catch(console.error);
