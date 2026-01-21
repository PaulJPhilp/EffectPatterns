#!/usr/bin/env node
/**
 * Effect Patterns MCP Server - Stdio Transport
 *
 * Provides Model Context Protocol (MCP) interface for the Effect Patterns API.
 * Allows Claude Code IDE and other MCP clients to access pattern tools via stdio.
 *
 * This is a PURE TRANSPORT layer - all authentication and authorization
 * (including tier validation) happens at the HTTP API level.
 *
 * Usage:
 *   node dist/mcp-stdio.js                    # Local dev (no auth)
 *   PATTERN_API_KEY=xxx node dist/mcp-stdio.js  # With API key
 *
 * Environment Variables:
 *   - PATTERN_API_KEY: Optional. API key passed to HTTP API (auth happens there)
 *   - EFFECT_PATTERNS_API_URL: Optional. Base URL for patterns API
 *   - MCP_DEBUG: Optional. Enable debug logging (default: false)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools/tool-implementations.js";
import { getActiveMCPConfig } from "./config/mcp-environments.js";

// ============================================================================
// Configuration
// ============================================================================

// Get configuration from environment (local, staging, or production)
const config = getActiveMCPConfig();
const API_BASE_URL = config.apiUrl;
const API_KEY = config.apiKey;
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

/**
 * API call result - either success data or error information.
 * Following Effect-style: errors as values, not exceptions.
 */
type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

async function callApi(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  data?: unknown,
): Promise<ApiResult<unknown>> {
  const url = `${API_BASE_URL}/api${endpoint}`;

  // Build headers - only add API key if provided
  // Auth validation happens at HTTP API level
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (API_KEY) {
    headers["x-api-key"] = API_KEY;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (data && method === "POST") {
    options.body = JSON.stringify(data);
  }

  log(`API ${method} ${endpoint}`);

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      // Return error as value, not exception
      const errorBody = await response.text();
      log(`API Error: HTTP ${response.status}`);
      return {
        ok: false,
        error: errorBody || `HTTP ${response.status}`,
        status: response.status,
      };
    }

    const result = await response.json();
    return { ok: true, data: result };
  } catch (error) {
    // Network or parsing errors
    const msg = error instanceof Error ? error.message : String(error);
    log(`API Error: ${msg}`);
    return { ok: false, error: msg };
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
  // Warn if no API key - auth happens at HTTP API level
  if (!API_KEY) {
    console.error(
      "[Effect Patterns MCP] No API key configured. " +
        "Requests will fail if HTTP API requires authentication."
    );
  }

  log("Starting MCP server", {
    environment: config.name,
    apiUrl: API_BASE_URL,
    hasApiKey: !!API_KEY,
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
