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

import { getActiveMCPConfig } from "@/config/mcp-environments.js";
import { registerTools } from "@/tools/tool-implementations.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Agent } from "http";
import { Agent as HttpsAgent } from "https";

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
 * Bounded cache with LRU eviction to prevent memory leaks
 * Maintains both time-based expiration and size-based eviction
 */
class BoundedCache<T> {
  private cache = new Map<string, { expiresAt: number; value: T; accessTime: number }>();
  private readonly maxEntries: number;

  constructor(maxEntries: number) {
    this.maxEntries = maxEntries;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update access time for LRU tracking
    entry.accessTime = Date.now();
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    // Evict oldest entry if cache is full (LRU)
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      let oldestKey = "";
      let oldestAccessTime = Infinity;

      for (const [k, v] of this.cache) {
        if (v.accessTime < oldestAccessTime) {
          oldestAccessTime = v.accessTime;
          oldestKey = k;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      accessTime: Date.now(),
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

/**
 * In-flight request deduping with time-based expiration
 * Key: request signature (endpoint + method + data hash)
 * Value: { promise, createdAt } to prevent stale dedup sharing
 *
 * CRITICAL: Promises older than DEDUP_TIMEOUT_MS are not shared to prevent
 * error cascade when one request fails and others share its error result.
 */
const DEDUP_TIMEOUT_MS = 500; // Dedupe window (don't share promises older than this)
const inFlightRequests = new Map<
  string,
  { promise: Promise<ApiResult<unknown>>; createdAt: number }
>();
const patternsCache = new BoundedCache<ApiResult<unknown>>(100); // Max 100 pattern cache entries
const PATTERNS_SEARCH_CACHE_TTL_MS = 5_000;
const PATTERNS_DETAIL_CACHE_TTL_MS = 2_000;

// Telemetry counters
let dedupeHits = 0;
let dedupeMisses = 0;
let inFlightRequestCount = 0;

// ============================================================================
// Handshake Metrics (debug only)
// ============================================================================

const handshakeCounters = {
  api: 0,
};

function logHandshakeCounts(reason: string) {
  if (!DEBUG) return;
  log("Handshake counts", {
    reason,
    api: handshakeCounters.api,
  });
}

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
  const isPatternsGet =
    method === "GET" && endpoint.startsWith("/patterns");
  const isPatternDetail = isPatternsGet && endpoint.startsWith("/patterns/");

  if (isPatternsGet) {
    const cached = patternsCache.get(requestKey);
    if (cached) {
      log(`Cache hit (patterns): ${requestKey}`);
      return cached;
    }
  }

  // Check for in-flight request (dedupe) - CRITICAL: only share if within time window
  const inFlight = inFlightRequests.get(requestKey);
  const now = Date.now();

  if (inFlight && (now - inFlight.createdAt) < DEDUP_TIMEOUT_MS) {
    dedupeHits++;
    log(`API Dedupe Hit: ${requestKey} (age: ${now - inFlight.createdAt}ms)`);
    return inFlight.promise;
  } else if (inFlight) {
    // Dedup timeout expired - clean up stale entry
    log(`Dedup timeout expired (age: ${now - inFlight.createdAt}ms), removing stale entry`);
    inFlightRequests.delete(requestKey);
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
    // @ts-expect-error - Node.js fetch (undici) supports agent option for connection pooling.
    // This is a non-standard extension specific to Node.js runtime (not Web API compliant).
    // Used for HTTP/HTTPS connection reuse with keep-alive and socket limits.
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

      const result = await response.json() as any;
      const apiResult: ApiResult<unknown> = { 
        ok: true, 
        data: (result && typeof result === "object" && result.data !== undefined) ? result.data : result 
      };
      if (isPatternsGet) {
        const ttl = isPatternDetail
          ? PATTERNS_DETAIL_CACHE_TTL_MS
          : PATTERNS_SEARCH_CACHE_TTL_MS;
        patternsCache.set(requestKey, apiResult, ttl);
      }
      return apiResult;
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
  // Include createdAt timestamp to prevent sharing promises across timeout window
  if (method === "GET") {
    // Enforce max in-flight requests to prevent memory leak
    if (inFlightRequests.size >= 500) {
      // Remove oldest in-flight request
      const oldestKey = inFlightRequests.keys().next().value;
      if (oldestKey) {
        log(`In-flight limit reached (500), removing oldest: ${oldestKey}`);
        inFlightRequests.delete(oldestKey);
      }
    }

    inFlightRequests.set(requestKey, {
      promise: requestPromise,
      createdAt: Date.now(),
    });
    inFlightRequestCount = inFlightRequests.size;

    // Clean up expired in-flight requests periodically (every 100 requests)
    if (inFlightRequestCount % 100 === 0) {
      const now = Date.now();
      for (const [key, value] of inFlightRequests) {
        if (now - value.createdAt > DEDUP_TIMEOUT_MS * 10) {
          inFlightRequests.delete(key);
        }
      }
    }
  }

  handshakeCounters.api++;
  logHandshakeCounts("api");

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
const MCP_SERVER_VERSION = "2.0.0";

// ============================================================================
// MCP Server Setup
// ============================================================================

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
