#!/usr/bin/env node
/**
 * Effect Patterns MCP Server - Stdio Transport
 *
 * Provides Model Context Protocol (MCP) interface for the Effect Patterns API.
 * Allows Claude Code IDE and other MCP clients to access pattern tools via stdio.
 *
 * This is a PURE TRANSPORT layer - all authentication and authorization
 * happens at the HTTP API level.
 *
 * Usage:
 *   node dist/mcp-stdio.js                    # Local dev (no auth)
 *   PATTERN_API_KEY=xxx node dist/mcp-stdio.js  # With API key
 *
 * Environment Variables:
 *   - PATTERN_API_KEY: Optional. API key passed to HTTP API (auth happens there)
 *   - EFFECT_PATTERNS_API_URL: Optional. Base URL for patterns API
 *   - MCP_DEBUG: Optional. Enable debug logging (default: false)
 *   - OTEL_ENABLED: Optional. Enable OpenTelemetry tracing (default: true)
 *   - OTLP_ENDPOINT: Optional. OTLP HTTP endpoint for traces
 *   - SERVICE_NAME: Optional. Service name for OTEL (default: effect-patterns-mcp-transport)
 */

import { getActiveMCPConfig } from "@/config/mcp-environments.js";
import { buildAppLayer } from "@/services/layers.js";
import { initOtel } from "@/services/otel-init.js";
import { registerToolsEffect } from "@/tools/tool-implementations.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Agent } from "http";
import { Agent as HttpsAgent } from "https";

// ============================================================================
// Configuration
// ============================================================================

const config = getActiveMCPConfig();
const API_BASE_URL = config.apiUrl;
const API_KEY = config.apiKey;
const DEBUG = process.env.MCP_DEBUG === "true";
const REQUEST_TIMEOUT_MS = 10000;

// Extract API host for diagnostics (safe, no secrets)
let API_HOST = "<invalid>";
try {
  const apiUrl = new URL(API_BASE_URL);
  API_HOST = apiUrl.host;
} catch {
  // URL parsing failed, keep "<invalid>"
}

// ============================================================================
// HTTP Connection Pooling
// ============================================================================

const httpAgent = new Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: REQUEST_TIMEOUT_MS,
});

const httpsAgent = new HttpsAgent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: REQUEST_TIMEOUT_MS,
});

// ============================================================================
// Minimal Logging (stderr only - stdout is reserved for protocol)
// ============================================================================

function log(message: string, data?: unknown) {
  if (DEBUG) {
    console.error(
      `[MCP] ${message}`,
      data ? JSON.stringify(data, null, 2) : "",
    );
  }
}

// ============================================================================
// OTEL + Effect Layer
// ============================================================================

const otelSdk = initOtel();

const appLayer = buildAppLayer({
  apiBaseUrl: API_BASE_URL,
  apiKey: API_KEY,
  requestTimeoutMs: REQUEST_TIMEOUT_MS,
  httpAgent,
  httpsAgent,
});

// ============================================================================
// MCP Server Setup
// ============================================================================

const MCP_SERVER_VERSION = "2.0.0";

const server = new McpServer(
  {
    name: "effect-patterns",
    version: MCP_SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// ============================================================================
// Tool Handlers (Effect-based with OTEL tracing)
// ============================================================================

registerToolsEffect(server, appLayer);

// ============================================================================
// Server Startup
// ============================================================================

async function main() {
  // DIAGNOSTIC LOG (always to stderr, no secrets)
  console.error(
    `[DIAGNOSTIC] API_HOST=${API_HOST} HAS_API_KEY=${!!API_KEY}`,
  );

  if (!API_KEY) {
    console.error(
      "[Effect Patterns MCP] No API key configured. " +
        "Requests will fail if HTTP API requires authentication.",
    );
  }

  log("Starting MCP server", {
    environment: config.name,
    apiUrl: API_BASE_URL,
    hasApiKey: !!API_KEY,
    debug: DEBUG,
    otelEnabled: otelSdk !== null,
  });

  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    log("MCP server connected via stdio");
    console.error(
      `[MCP-DEBUG-SIGNAL-99] Server started. Path: ${process.cwd()}`,
    );
  } catch (error) {
    console.error("[Effect Patterns MCP] Failed to start:", error);
    process.exit(1);
  }
}

// ============================================================================
// Fatal Error Handlers (stderr only - stdout is reserved for protocol)
// ============================================================================

process.on("uncaughtException", (error) => {
  console.error("[Effect Patterns MCP] FATAL: Uncaught exception:", error);
  console.error("[Effect Patterns MCP] Stack:", error.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[Effect Patterns MCP] FATAL: Unhandled rejection:", reason);
  console.error("[Effect Patterns MCP] Promise:", promise);
  if (reason instanceof Error) {
    console.error("[Effect Patterns MCP] Stack:", reason.stack);
  }
  process.exit(1);
});

process.on("SIGPIPE", () => {
  console.error(
    "[Effect Patterns MCP] FATAL: SIGPIPE - stdin/stdout pipe broken",
  );
  process.exit(1);
});

process.on("exit", (code) => {
  console.error(`[Effect Patterns MCP] Process exiting with code: ${code}`);
  // Graceful OTEL shutdown
  if (otelSdk) {
    try {
      otelSdk.shutdown();
    } catch {
      // Best-effort shutdown
    }
  }
});

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
  if (error instanceof Error) {
    console.error("[Effect Patterns MCP] Stack:", error.stack);
  }
  process.exit(1);
});
