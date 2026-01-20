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
 *   - EFFECT_PATTERNS_API_URL: Optional. Base URL for patterns API (default: https://api.effect-patterns.com)
 *   - MCP_DEBUG: Optional. Enable debug logging (default: false)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools/tool-implementations.js";

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL =
  process.env.EFFECT_PATTERNS_API_URL ||
  "https://effect-patterns-mcp.vercel.app";
const API_KEY = process.env.PATTERN_API_KEY;
const DEBUG = process.env.MCP_DEBUG === "true";

// ============================================================================
// Minimal Logging
// ============================================================================

function log(message: string, data?: unknown) {
  if (DEBUG) {
    console.error(`[MCP] ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }
}

// ============================================================================
// API Client
// ============================================================================

async function callApi(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  data?: unknown,
) {
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

  log(`API ${method} ${endpoint}`);

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log(`API Error: ${msg}`);
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
    },
  },
);

// ============================================================================
// Tool Handlers
// ============================================================================

// Register all tools using the shared implementation
registerTools(server, callApi, log);

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
