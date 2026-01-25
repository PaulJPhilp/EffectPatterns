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
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Agent } from "http";
import { Agent as HttpsAgent } from "https";
import { getActiveMCPConfig } from "@/config/mcp-environments.js";
import { registerTools } from "@/tools/tool-implementations.js";

// ============================================================================
// Configuration
// ============================================================================

// Get configuration from environment (local, staging, or production)
const config = getActiveMCPConfig();
const API_BASE_URL = config.apiUrl;
const API_KEY = config.apiKey;
const DEBUG = process.env.MCP_DEBUG === "true";
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds timeout

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

// Global agents with connection reuse and keep-alive
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

/**
 * In-flight request deduping
 * Key: request signature (endpoint + method + data hash)
 * Value: Promise that resolves to ApiResult
 */
const inFlightRequests = new Map<string, Promise<ApiResult<unknown>>>();

// Telemetry counters
let dedupeHits = 0;
let dedupeMisses = 0;

function getRequestKey(
  endpoint: string,
  method: "GET" | "POST",
  data?: unknown,
): string {
  // For GET requests, include query params in key
  // For POST requests, include data hash (simplified: JSON stringify)
  const dataStr = data ? JSON.stringify(data) : "";
  return `${method}:${endpoint}:${dataStr}`;
}

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
// API Client
// ============================================================================

/**
 * API call result - either success data or error information.
 * Following Effect-style: errors as values, not exceptions.
 *
 * Details object captures diagnostic info for network errors.
 */
type ApiResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      status?: number;
      details?: {
        errorName?: string;
        errorType?: string;
        errorMessage?: string;
        cause?: string;
        retryable?: boolean;
        apiHost?: string;
        hasApiKey?: boolean;
      };
    };

async function callApi(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  data?: unknown,
): Promise<ApiResult<unknown>> {
  const url = `${API_BASE_URL}/api${endpoint}`;
  const requestKey = getRequestKey(endpoint, method, data);

  // Check for in-flight request (dedupe)
  const inFlight = inFlightRequests.get(requestKey);
  if (inFlight) {
    dedupeHits++;
    log(`API Dedupe Hit: ${requestKey}`);
    return inFlight;
  }

  dedupeMisses++;

  // Build headers - only add API key if provided
  // Auth validation happens at HTTP API level
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

  // Select agent based on protocol
  const isHttps = url.startsWith("https");
  const agentOption = isHttps ? httpsAgent : httpAgent;

  const options: RequestInit = {
    method,
    headers,
    signal: controller.signal,
    // @ts-expect-error - Node.js fetch supports agent option
    agent: agentOption,
  };

  if (data && method === "POST") {
    options.body = JSON.stringify(data);
  }

  log(`API ${method} ${endpoint}`);

  // Create promise for this request
  const requestPromise = (async (): Promise<ApiResult<unknown>> => {
    try {
      const response = await fetch(url, options);
      clearTimeout(timeoutId);

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
      clearTimeout(timeoutId);

      // Capture detailed error information
      const errorName = error instanceof Error ? error.name : "Unknown";
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const cause =
        error instanceof Error &&
        "cause" in error &&
        error.cause instanceof Error
          ? error.cause.message
          : undefined;

      // Check if it was a timeout (AbortError)
      if (errorName === "AbortError") {
        const msg = `Request timeout after ${REQUEST_TIMEOUT_MS}ms`;
        log(`API Error: ${msg}`);
        return {
          ok: false,
          error: msg,
          details: {
            errorName: "AbortError",
            errorType: "timeout",
            errorMessage: msg,
            retryable: true,
            apiHost: API_HOST,
            hasApiKey: !!API_KEY,
          },
        };
      }

      // Classify error type and retryability
      let errorType = "network";
      let retryable = true;

      if (errorName === "TypeError" && errorMessage.includes("fetch")) {
        errorType = "fetch_error";
        retryable = true;
      } else if (cause?.includes("ECONNREFUSED")) {
        errorType = "connection_refused";
        retryable = true;
      } else if (cause?.includes("ENOTFOUND")) {
        errorType = "dns_error";
        retryable = true;
      } else if (cause?.includes("ETIMEDOUT") || cause?.includes("timeout")) {
        errorType = "timeout";
        retryable = true;
      } else if (cause?.includes("ECONNRESET")) {
        errorType = "connection_reset";
        retryable = true;
      } else if (
        cause?.includes("CERT") ||
        cause?.includes("SSL") ||
        cause?.includes("TLS")
      ) {
        errorType = "tls_error";
        retryable = false; // TLS errors are not retryable
      }

      const msg = errorMessage;
      log(`API Error: ${errorName}: ${msg}`, {
        cause,
        errorType,
        retryable,
        apiHost: API_HOST,
        hasApiKey: !!API_KEY,
      });

      return {
        ok: false,
        error: msg,
        details: {
          errorName,
          errorType,
          errorMessage: msg,
          cause,
          retryable,
          apiHost: API_HOST,
          hasApiKey: !!API_KEY,
        },
      };
    } finally {
      // Clean up in-flight request
      inFlightRequests.delete(requestKey);
    }
  })();

  // Store in-flight request (only for GET requests to avoid side-effects)
  if (method === "GET") {
    inFlightRequests.set(requestKey, requestPromise);
  }

  return requestPromise;
}

// ============================================================================
// Simple In-Memory Cache for Tool Results
// ============================================================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly maxEntries = 1000;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number = 5 * 60 * 1000): void {
    // Evict oldest entry if cache is full (simple FIFO)
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
    };
  }
}

const toolCache = new SimpleCache();

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

// Register all tools using the shared implementation with cache support
registerTools(server, callApi, log, {
  get: (key: string) => toolCache.get(key),
  set: (key: string, value: any, ttl: number) => toolCache.set(key, value, ttl),
});

// ============================================================================
// Server Startup
// ============================================================================

async function main() {
  // ============================================================================
  // DIAGNOSTIC LOG (always to stderr, no secrets)
  // This is the critical startup diagnostic line for debugging env issues.
  // ============================================================================
  console.error(
    `[DIAGNOSTIC] API_HOST=${API_HOST} HAS_API_KEY=${!!API_KEY}`,
  );

  // Warn if no API key - auth happens at HTTP API level
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
});

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
  if (error instanceof Error) {
    console.error("[Effect Patterns MCP] Stack:", error.stack);
  }
  process.exit(1);
});
