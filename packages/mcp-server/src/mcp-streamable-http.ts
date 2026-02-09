#!/usr/bin/env node
/**
 * Effect Patterns MCP Server - Streamable HTTP Transport (MCP 2.0)
 *
 * Provides Model Context Protocol (MCP) 2.0 interface for the Effect Patterns API.
 * Supports the new Streamable HTTP transport for remote connections.
 *
 * This is a PURE TRANSPORT layer - all authentication and authorization
 * (including tier validation) happens at the HTTP API level.
 *
 * Usage:
 *   node dist/mcp-streamable-http.js                    # Local dev (no auth)
 *   PATTERN_API_KEY=xxx node dist/mcp-streamable-http.js  # With API key
 *
 * Environment Variables:
 *   - PATTERN_API_KEY: Optional. API key passed to HTTP API (auth happens there)
 *   - EFFECT_PATTERNS_API_URL: Optional. Base URL for patterns API
 *   - MCP_DEBUG: Optional. Enable debug logging (default: false)
 *   - PORT: Optional. Port for the HTTP server (default: 3001)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "crypto";
import { Agent, createServer } from "http";
import { Agent as HttpsAgent } from "https";
import { validateTransportApiKey } from "./auth/mcpTransportAuth.js";
import { OAuthConfig } from "./auth/oauth-config.js";
import { OAuth2Server } from "./auth/oauth-server.js";
import { registerTools } from "./tools/tool-implementations.js";

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL =
    process.env.EFFECT_PATTERNS_API_URL ||
    "https://effect-patterns-mcp.vercel.app";
const API_KEY = process.env.PATTERN_API_KEY;
const DEBUG = process.env.MCP_DEBUG === "true";
const PORT = parseInt(process.env.PORT || "3001", 10);
const OAUTH_CLIENT_ID =
    process.env.MCP_OAUTH_CLIENT_ID?.trim() || "effect-patterns-mcp";
const OAUTH_CLIENT_SECRET = process.env.MCP_OAUTH_CLIENT_SECRET?.trim();
const OAUTH_TOKEN_AUTH_METHOD = (() => {
    const raw = process.env.MCP_OAUTH_TOKEN_AUTH_METHOD?.trim();
    if (!raw) return "none" as const;
    if (
        raw === "none" ||
        raw === "client_secret_basic" ||
        raw === "client_secret_post"
    ) {
        return raw;
    }
    throw new Error(
        `Invalid MCP_OAUTH_TOKEN_AUTH_METHOD: ${raw}. Expected one of: none, client_secret_basic, client_secret_post`,
    );
})();
const SSE_DROP_AFTER_MS = parseInt(
    process.env.MCP_SSE_DROP_AFTER_MS || "0",
    10,
);
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds timeout

// OAuth 2.1 Configuration
const oauthConfig: OAuthConfig = {
    authorizationEndpoint: `http://localhost:${PORT}/auth`,
    tokenEndpoint: `http://localhost:${PORT}/token`,
    clientId: OAUTH_CLIENT_ID,
    clientSecret: OAUTH_CLIENT_SECRET,
    redirectUris: [
        "http://localhost:3000/callback",
        "http://localhost:3001/callback",
        "https://effect-patterns.com/callback",
    ],
    defaultScopes: ["mcp:access", "patterns:read"],
    supportedScopes: [
        "mcp:access",
        "patterns:read",
        "patterns:write",
        "analysis:run",
    ],
    requirePKCE: true, // OAuth 2.1 requirement
    tokenEndpointAuthMethod: OAUTH_TOKEN_AUTH_METHOD,
    accessTokenLifetime: 3600, // 1 hour
    refreshTokenLifetime: 86400, // 24 hours
};

// ============================================================================
// Logging
// ============================================================================

function log(message: string, data?: unknown) {
    if (DEBUG) {
        console.error(
            `[MCP-HTTP] ${message}`,
            data ? JSON.stringify(data, null, 2) : "",
        );
    }
}

// ============================================================================
// In-Memory Event Store (resumable sessions)
// ============================================================================

type StoredEvent = {
    eventId: string;
    streamId: string;
    message: unknown;
};

class InMemoryEventStore {
    private events: StoredEvent[] = [];
    private counter = 0;

    async storeEvent(streamId: string, message: unknown): Promise<string> {
        const eventId = String(++this.counter);
        this.events.push({ eventId, streamId, message });
        log("Event stored", { streamId, eventId });
        return eventId;
    }

    async getStreamIdForEventId(eventId: string): Promise<string | undefined> {
        const found = this.events.find((e) => e.eventId === eventId);
        return found?.streamId;
    }

    async replayEventsAfter(
        lastEventId: string,
        { send }: { send: (eventId: string, message: unknown) => Promise<void> },
    ): Promise<string> {
        log("Replay requested", { lastEventId });
        const startIndex = this.events.findIndex((e) => e.eventId === lastEventId);
        if (startIndex === -1) {
            throw new Error("Unknown eventId");
        }
        const streamId = this.events[startIndex]?.streamId;
        for (const event of this.events.slice(startIndex + 1)) {
            if (event.streamId === streamId) {
                await send(event.eventId, event.message);
            }
        }
        log("Replay completed", { streamId });
        return streamId!;
    }
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

function getRequestKey(
    endpoint: string,
    method: "GET" | "POST",
    data?: unknown,
): string {
    const dataStr = data ? JSON.stringify(data) : "";
    return `${method}:${endpoint}:${dataStr}`;
}

// ============================================================================
// Handshake Metrics (debug only)
// ============================================================================

const handshakeCounters = {
    mcp: 0,
    auth: 0,
    token: 0,
    api: 0,
};

function logHandshakeCounts(reason: string) {
    if (!DEBUG) return;
    log("Handshake counts", {
        reason,
        mcp: handshakeCounters.mcp,
        auth: handshakeCounters.auth,
        token: handshakeCounters.token,
        api: handshakeCounters.api,
    });
}

// ============================================================================
// Security Validation
// ============================================================================

function validateOrigin(origin: string | undefined): boolean {
    // For local development, allow localhost origins
    if (!origin) return true;

    const allowedOrigins = [
        "http://localhost:3000",
        "https://localhost:3000",
        "http://localhost:3001",
        "https://localhost:3001",
        "http://127.0.0.1:3000",
        "https://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "https://127.0.0.1:3001",
    ];

    // In production, you should restrict this to your actual domain
    if (process.env.NODE_ENV === "production") {
        allowedOrigins.push("https://effect-patterns.com");
        allowedOrigins.push("https://effect-patterns-mcp.vercel.app");
    }

    return allowedOrigins.includes(origin);
}

// ============================================================================
// API Client
// ============================================================================

/**
 * API call result - either success data or error information.
 * Following Effect-style: errors as values, not exceptions.
 *
 * Error details object provides diagnostic information for network errors:
 * - errorName: Error constructor name (e.g., "AbortError", "TypeError")
 * - errorType: Classified error type (timeout, connection_refused, dns_error, etc.)
 * - errorMessage: Human-readable error message
 * - cause: Underlying error cause (e.g., "ECONNREFUSED")
 * - retryable: Whether the request can be safely retried
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
        log(`API Dedupe Hit: ${requestKey} (age: ${now - inFlight.createdAt}ms)`);
        return inFlight.promise;
    } else if (inFlight) {
        // Dedup timeout expired - clean up stale entry
        log(`Dedup timeout expired (age: ${now - inFlight.createdAt}ms), removing stale entry`);
        inFlightRequests.delete(requestKey);
    }

    // Build headers - only add API key if provided
    // Auth validation happens at HTTP API level
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "MCP-Protocol-Version": "2025-11-25", // MCP 2.0 protocol version
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

    log(`API ${method} ${endpoint}`, data);

    const requestPromise = (async (): Promise<ApiResult<unknown>> => {
        try {
            const response = await fetch(url, options);
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                log(`API Error: HTTP ${response.status}`);
                return {
                    ok: false,
                    error: errorText || `HTTP ${response.status}`,
                    status: response.status,
                };
            }

            const result = await response.json() as any;
            log(`API Response`, result);
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
                    status: 408, // HTTP Request Timeout
                };
            }

            // Classify error type and retryability (same as stdio for parity)
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
                },
            };
        } finally {
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

        // Clean up expired in-flight requests periodically (every 100 requests)
        if (inFlightRequests.size % 100 === 0) {
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
// MCP Server Setup
// ============================================================================

const server = new McpServer(
    {
        name: "effect-patterns",
        version: "2.0.0",
    },
    {
        capabilities: {
            tools: {
                listChanged: true,
            },
        },
    },
);

// ============================================================================
// Tool Registrations (using same pattern as stdio version)
// ============================================================================

class SimpleCache {
    private cache = new Map<string, { value: any; expiresAt: number }>();
    private maxEntries: number;

    constructor(maxEntries = 500) {
        this.maxEntries = maxEntries;
    }

    get(key: string) {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.value;
    }

    set(key: string, value: any, ttlMs: number) {
        if (this.cache.size >= this.maxEntries) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            value,
            expiresAt: Date.now() + ttlMs,
        });
    }
}

const toolCache = new SimpleCache();

registerTools(server, callApi, log, {
    get: (key: string) => toolCache.get(key),
    set: (key: string, value: any, ttl: number) => toolCache.set(key, value, ttl),
});

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

    log("Starting MCP 2.0 Streamable HTTP server with OAuth 2.1", {
        apiUrl: API_BASE_URL,
        port: PORT,
        hasApiKey: !!API_KEY,
        debug: DEBUG,
        oauthEnabled: true,
    });

    try {
        // Initialize OAuth 2.1 server
        const oauthServer = new OAuth2Server(oauthConfig);

        // Create Streamable HTTP transport with session management
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(), // Enable stateful mode
            enableJsonResponse: false, // Use SSE streaming for better MCP 2.0 support
            eventStore: new InMemoryEventStore(), // Enable resumption within this process
            onsessioninitialized: (sessionId) => {
                log("Session initialized", { sessionId });
            },
            onsessionclosed: (sessionId) => {
                log("Session closed", { sessionId });
            },
        });

        // Connect MCP server to transport
        await server.connect(transport);

        // Create HTTP server with OAuth and MCP request handling
        const httpServer = createServer(async (req, res) => {
            log("HTTP request", {
                method: req.method,
                url: req.url,
                origin: req.headers.origin,
                userAgent: req.headers["user-agent"],
            });

            // Route handling
            const url = req.url || "/";

            // OAuth endpoints
            if (url.startsWith("/auth")) {
                handshakeCounters.auth++;
                logHandshakeCounts("auth");
                await oauthServer.handleAuthorizationRequest(req, res);
                return;
            }

            if (url.startsWith("/token")) {
                handshakeCounters.token++;
                logHandshakeCounts("token");
                await oauthServer.handleTokenRequest(req, res);
                return;
            }

            // MCP endpoint with OAuth protection
            if (url === "/mcp" && (req.method === "POST" || req.method === "GET")) {
                handshakeCounters.mcp++;
                logHandshakeCounts("mcp");
                // Prefer API key auth for best DX; fallback to OAuth token
                const apiKeyHeader = req.headers["x-api-key"];
                const apiKeyFromHeader =
                    typeof apiKeyHeader === "string"
                        ? apiKeyHeader
                        : Array.isArray(apiKeyHeader)
                        ? apiKeyHeader[0]
                        : undefined;
                const requestUrl = new URL(req.url || "/mcp", `http://${req.headers.host}`);
                const apiKeyFromQuery =
                    requestUrl.searchParams.get("key") ||
                    requestUrl.searchParams.get("api_key") ||
                    undefined;
                const apiKey = apiKeyFromHeader || apiKeyFromQuery;

                const apiKeyAuth = validateTransportApiKey(apiKey, API_KEY);
                if (!apiKeyAuth.ok) {
                    log("Unauthorized MCP request - invalid API key", {
                        reason: apiKeyAuth.error,
                    });
                    res.writeHead(401, {
                        "Content-Type": "application/json",
                        "WWW-Authenticate":
                            'Bearer realm="MCP Server", error="invalid_token"',
                    });
                    res.end(
                        JSON.stringify({
                            jsonrpc: "2.0",
                            error: {
                                code: -32001,
                                message: apiKeyAuth.error,
                            },
                        }),
                    );
                    return;
                }

                const session = apiKeyAuth.authenticatedByApiKey
                    ? null
                    : await oauthServer.validateBearerToken(req);
                if (!apiKeyAuth.authenticatedByApiKey && !session) {
                    log("Unauthorized MCP request - missing API key or OAuth token");
                    res.writeHead(401, {
                        "Content-Type": "application/json",
                        "WWW-Authenticate":
                            'Bearer realm="MCP Server", error="invalid_token"',
                    });
                    res.end(
                        JSON.stringify({
                            jsonrpc: "2.0",
                            error: {
                                code: -32001,
                                message: "Unauthorized - valid API key or OAuth token required",
                            },
                        }),
                    );
                    return;
                }

                // Validate Origin header to prevent DNS rebinding attacks
                const origin = req.headers.origin;
                if (!validateOrigin(origin)) {
                    log("Invalid origin rejected", {
                        origin,
                        sessionId: session?.clientId,
                    });
                    res.writeHead(403, { "Content-Type": "application/json" });
                    res.end(
                        JSON.stringify({
                            jsonrpc: "2.0",
                            error: {
                                code: -32600,
                                message: "Invalid Origin header",
                            },
                        }),
                    );
                    return;
                }

                // Add MCP protocol version and OAuth info to headers
                res.setHeader("MCP-Protocol-Version", "2025-11-25");
                if (session) {
                    res.setHeader("X-OAuth-Client-ID", session.clientId);
                    res.setHeader("X-OAuth-Scopes", session.scopes.join(" "));
                }

                try {
                    if (req.method === "GET") {
                        const lastEventId =
                            req.headers["last-event-id"] ||
                            req.headers["Last-Event-ID"];
                        log("SSE reconnect header", { lastEventId });
                    }
                    if (SSE_DROP_AFTER_MS > 0 && req.method === "GET") {
                        // Close SSE connection to force client reconnect (replay test).
                        setTimeout(() => {
                            if (!res.writableEnded) {
                                res.end();
                            }
                        }, SSE_DROP_AFTER_MS);
                    }

                    // Parse body for POST requests
                    let parsedBody;
                    if (req.method === "POST") {
                        const chunks: any[] = [];
                        for await (const chunk of req) {
                            chunks.push(chunk);
                        }
                        const body = Buffer.concat(chunks).toString();
                        parsedBody = body ? JSON.parse(body) : undefined;
                    }

                    // Handle the MCP request
                    await transport.handleRequest(req, res, parsedBody);
                } catch (error) {
                    log("Request handling error", {
                        error,
                        sessionId: session?.clientId,
                    });
                    if (!res.headersSent) {
                        res.writeHead(500, { "Content-Type": "application/json" });
                        res.end(
                            JSON.stringify({
                                jsonrpc: "2.0",
                                error: {
                                    code: -32603,
                                    message: "Internal server error",
                                },
                            }),
                        );
                    }
                }
                return;
            }

            // OAuth discovery endpoint
            if (url === "/.well-known/oauth-authorization-server") {
                res.writeHead(200, {
                    "Content-Type": "application/json",
                    "Cache-Control": "public, max-age=3600", // Cache for 1 hour
                });
                res.end(
                    JSON.stringify({
                        issuer: `http://localhost:${PORT}`,
                        authorization_endpoint: oauthConfig.authorizationEndpoint,
                        token_endpoint: oauthConfig.tokenEndpoint,
                        response_types_supported: ["code"],
                        grant_types_supported: ["authorization_code", "refresh_token"],
                        scopes_supported: oauthConfig.supportedScopes,
                        token_endpoint_auth_methods_supported: [
                            oauthConfig.tokenEndpointAuthMethod,
                        ],
                        code_challenge_methods_supported: ["S256"],
                        require_pkce: oauthConfig.requirePKCE,
                    }),
                );
                return;
            }

            // Server info endpoint
            if (url === "/info") {
                res.writeHead(200, {
                    "Content-Type": "application/json",
                    "Cache-Control": "public, max-age=3600", // Cache for 1 hour
                });
                res.end(
                    JSON.stringify({
                        name: "Effect Patterns MCP Server",
                        version: "2.0.0",
                        protocol: "MCP 2.0",
                        transport: "Streamable HTTP",
                        oauth: {
                            enabled: true,
                            flows: ["authorization_code", "refresh_token"],
                            pkce_required: true,
                            scopes: oauthConfig.supportedScopes,
                        },
                        endpoints: {
                            authorization: oauthConfig.authorizationEndpoint,
                            token: oauthConfig.tokenEndpoint,
                            mcp: `http://localhost:${PORT}/mcp`,
                            discovery: `http://localhost:${PORT}/.well-known/oauth-authorization-server`,
                        },
                    }),
                );
                return;
            }

            // Return 404 for other endpoints
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(
                JSON.stringify({
                    error: "Not Found",
                    message: "The requested endpoint does not exist",
                    available_endpoints: [
                        "/auth - OAuth authorization endpoint",
                        "/token - OAuth token endpoint",
                        "/mcp - MCP protocol endpoint",
                        "/.well-known/oauth-authorization-server - OAuth discovery",
                        "/info - Server information",
                    ],
                }),
            );
        });

        // Start HTTP server
        httpServer.listen(PORT, () => {
            log("MCP 2.0 Streamable HTTP server started with OAuth 2.1", {
                port: PORT,
                endpoint: `http://localhost:${PORT}/mcp`,
                protocolVersion: "2025-11-25",
                oauthEnabled: true,
                authorizationEndpoint: oauthConfig.authorizationEndpoint,
                tokenEndpoint: oauthConfig.tokenEndpoint,
            });
            console.error(
                `[Effect Patterns MCP] HTTP server started on port ${PORT}`,
            );
            console.error(
                `[Effect Patterns MCP] MCP endpoint: http://localhost:${PORT}/mcp`,
            );
            console.error(
                `[Effect Patterns MCP] OAuth authorization: http://localhost:${PORT}/auth`,
            );
            console.error(
                `[Effect Patterns MCP] OAuth token: http://localhost:${PORT}/token`,
            );
            console.error(
                `[Effect Patterns MCP] Server info: http://localhost:${PORT}/info`,
            );
        });
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
