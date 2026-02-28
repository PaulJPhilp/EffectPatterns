#!/usr/bin/env node
/**
 * Effect Patterns MCP Server - Streamable HTTP Transport (MCP 2.0)
 *
 * Provides Model Context Protocol (MCP) 2.0 interface for the Effect Patterns API.
 * Supports the new Streamable HTTP transport for remote connections.
 *
 * This is a PURE TRANSPORT layer - all authentication and authorization
 * happens at the HTTP API level.
 *
 * Usage:
 *   node dist/mcp-streamable-http.js                    # Local dev (no auth)
 *   PATTERN_API_KEY=xxx node dist/mcp-streamable-http.js  # With API key
 *
 * Environment Variables:
 *   - PATTERN_API_KEY: Optional. API key passed to HTTP API (auth happens there)
 *   - EFFECT_PATTERNS_API_URL: Optional. Base URL for patterns API
 *   - MCP_SERVER_PUBLIC_URL: Optional. Public base URL used in OAuth metadata/discovery
 *   - MCP_DEBUG: Optional. Enable debug logging (default: false)
 *   - PORT: Optional. Port for the HTTP server (default: 3001)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "crypto";
import { Agent, createServer, IncomingMessage } from "http";
import { Agent as HttpsAgent } from "https";
import { buildAppLayer } from "./services/layers.js";
import { initOtel } from "./services/otel-init.js";
import { validateTransportApiKey } from "./auth/mcpTransportAuth.js";
import { OAuthConfig } from "./auth/oauth-config.js";
import { OAuth2Server } from "./auth/oauth-server.js";
import { registerToolsEffect } from "./tools/tool-implementations.js";

function getPositiveIntEnv(name: string, fallback: number): number {
    const raw = process.env[name];
    if (!raw) {
        return fallback;
    }

    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    return parsed;
}

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL =
    process.env.EFFECT_PATTERNS_API_URL ||
    "https://effect-patterns-mcp.vercel.app";
const API_KEY = process.env.PATTERN_API_KEY;
const DEBUG = process.env.MCP_DEBUG === "true";
const PORT = parseInt(process.env.PORT || "3001", 10);
const SERVER_BASE_URL = (
    process.env.MCP_SERVER_PUBLIC_URL?.trim() || `http://localhost:${PORT}`
).replace(/\/+$/, "");
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
const OAUTH_MAX_SESSIONS = getPositiveIntEnv("MCP_OAUTH_MAX_SESSIONS", 5000);
const OAUTH_MAX_AUTH_CODES = getPositiveIntEnv(
    "MCP_OAUTH_MAX_AUTH_CODES",
    5000,
);
const OAUTH_CLEANUP_INTERVAL_MS = getPositiveIntEnv(
    "MCP_OAUTH_CLEANUP_INTERVAL_MS",
    60_000,
);
const EVENT_STORE_MAX_EVENTS = getPositiveIntEnv(
    "MCP_EVENT_STORE_MAX_EVENTS",
    2000,
);
const EVENT_STORE_TTL_MS = getPositiveIntEnv(
    "MCP_EVENT_STORE_TTL_MS",
    15 * 60 * 1000,
);
const MCP_POST_BODY_MAX_BYTES = getPositiveIntEnv(
    "MCP_POST_BODY_MAX_BYTES",
    1_048_576, // 1 MB
);
const MCP_POST_BODY_TIMEOUT_MS = getPositiveIntEnv(
    "MCP_POST_BODY_TIMEOUT_MS",
    10_000, // 10 seconds
);

// OAuth 2.1 Configuration
const oauthConfig: OAuthConfig = {
    authorizationEndpoint: `${SERVER_BASE_URL}/auth`,
    tokenEndpoint: `${SERVER_BASE_URL}/token`,
    clientId: OAUTH_CLIENT_ID,
    clientSecret: OAUTH_CLIENT_SECRET,
    redirectUris: (process.env.OAUTH_REDIRECT_URIS || [
        "http://localhost:3000/callback",
        "http://localhost:3001/callback",
        "https://effect-patterns.com/callback",
        "https://effect-patterns-mcp-staging.vercel.app/callback",
    ].join(",")).split(",").map(s => s.trim()).filter(Boolean),
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
    createdAt: number;
};

class InMemoryEventStore {
    private events: StoredEvent[] = [];
    private counter = 0;

    constructor(
        private readonly maxEvents: number,
        private readonly eventTtlMs: number,
    ) {}

    private cleanupExpiredEvents(now: number): void {
        const cutoff = now - this.eventTtlMs;
        while (this.events.length > 0 && this.events[0]!.createdAt < cutoff) {
            this.events.shift();
        }
    }

    private enforceSizeLimit(): void {
        if (this.events.length <= this.maxEvents) {
            return;
        }
        const overflow = this.events.length - this.maxEvents;
        this.events.splice(0, overflow);
    }

    async storeEvent(streamId: string, message: unknown): Promise<string> {
        const now = Date.now();
        this.cleanupExpiredEvents(now);
        const eventId = String(++this.counter);
        this.events.push({ eventId, streamId, message, createdAt: now });
        this.enforceSizeLimit();
        log("Event stored", { streamId, eventId });
        return eventId;
    }

    async getStreamIdForEventId(eventId: string): Promise<string | undefined> {
        this.cleanupExpiredEvents(Date.now());
        const found = this.events.find((e) => e.eventId === eventId);
        return found?.streamId;
    }

    async replayEventsAfter(
        lastEventId: string,
        { send }: { send: (eventId: string, message: unknown) => Promise<void> },
    ): Promise<string> {
        log("Replay requested", { lastEventId });
        this.cleanupExpiredEvents(Date.now());
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

type McpRequestBodyErrorCode =
    | "payload_too_large"
    | "malformed_json"
    | "request_timeout"
    | "request_aborted"
    | "request_stream_error";

class McpRequestBodyError extends Error {
    constructor(
        readonly code: McpRequestBodyErrorCode,
        message: string,
        readonly cause?: unknown,
    ) {
        super(message);
        this.name = "McpRequestBodyError";
    }
}

function mapMcpRequestBodyError(error: McpRequestBodyError): {
    status: number;
    jsonRpcCode: number;
    message: string;
} {
    switch (error.code) {
        case "payload_too_large":
            return {
                status: 413,
                jsonRpcCode: -32013,
                message: `Request body too large. Maximum allowed size is ${MCP_POST_BODY_MAX_BYTES} bytes.`,
            };
        case "malformed_json":
            return {
                status: 400,
                jsonRpcCode: -32700,
                message: "Malformed JSON payload.",
            };
        case "request_timeout":
            return {
                status: 408,
                jsonRpcCode: -32008,
                message: `Request body parse timeout after ${MCP_POST_BODY_TIMEOUT_MS}ms.`,
            };
        case "request_aborted":
            return {
                status: 400,
                jsonRpcCode: -32600,
                message: "Request body was aborted by client.",
            };
        case "request_stream_error":
            return {
                status: 400,
                jsonRpcCode: -32600,
                message: "Unable to read request body.",
            };
    }
}

function getDeclaredContentLength(req: IncomingMessage): number | null {
    const header = req.headers["content-length"];
    const rawValue =
        typeof header === "string"
            ? header
            : Array.isArray(header)
              ? header[0]
              : undefined;

    if (!rawValue) {
        return null;
    }

    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return null;
    }

    return parsed;
}

async function parseMcpPostBody(req: IncomingMessage): Promise<unknown | undefined> {
    const declaredContentLength = getDeclaredContentLength(req);
    if (
        declaredContentLength !== null &&
        declaredContentLength > MCP_POST_BODY_MAX_BYTES
    ) {
        throw new McpRequestBodyError(
            "payload_too_large",
            "Declared content-length exceeds request body size limit.",
        );
    }

    return await new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        let totalBytes = 0;
        let settled = false;

        const cleanup = () => {
            clearTimeout(timeoutId);
            req.off("data", onData);
            req.off("end", onEnd);
            req.off("error", onError);
            req.off("aborted", onAborted);
        };

        const settle = (fn: () => void) => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();
            fn();
        };

        const timeoutId = setTimeout(() => {
            req.resume();
            settle(() =>
                reject(
                    new McpRequestBodyError(
                        "request_timeout",
                        "Request body parsing exceeded timeout limit.",
                    ),
                ),
            );
        }, MCP_POST_BODY_TIMEOUT_MS);

        const onAborted = () => {
            req.resume();
            settle(() =>
                reject(
                    new McpRequestBodyError(
                        "request_aborted",
                        "Request body was aborted before completion.",
                    ),
                ),
            );
        };

        const onError = (error: unknown) => {
            req.resume();
            settle(() =>
                reject(
                    new McpRequestBodyError(
                        "request_stream_error",
                        "Request stream emitted an error.",
                        error,
                    ),
                ),
            );
        };

        const onData = (chunk: Buffer | string) => {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            totalBytes += buffer.length;

            if (totalBytes > MCP_POST_BODY_MAX_BYTES) {
                req.resume();
                settle(() =>
                    reject(
                        new McpRequestBodyError(
                            "payload_too_large",
                            "Request body exceeded request body size limit.",
                        ),
                    ),
                );
                return;
            }

            chunks.push(buffer);
        };

        const onEnd = () => {
            settle(() => {
                if (totalBytes === 0) {
                    resolve(undefined);
                    return;
                }

                const rawBody = Buffer.concat(chunks, totalBytes).toString("utf8");
                if (rawBody.trim().length === 0) {
                    resolve(undefined);
                    return;
                }

                try {
                    resolve(JSON.parse(rawBody));
                } catch (error) {
                    reject(
                        new McpRequestBodyError(
                            "malformed_json",
                            "Request body is not valid JSON.",
                            error,
                        ),
                    );
                }
            });
        };

        req.on("data", onData);
        req.on("end", onEnd);
        req.on("error", onError);
        req.on("aborted", onAborted);
    });
}

// ============================================================================
// OTEL + Effect Layer
// ============================================================================

const otelSdk = initOtel();

const appLayer = buildAppLayer({
    apiBaseUrl: API_BASE_URL,
    apiKey: API_KEY,
    requestTimeoutMs: REQUEST_TIMEOUT_MS,
    extraHeaders: { "MCP-Protocol-Version": "2025-11-25" },
    httpAgent,
    httpsAgent,
});

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

registerToolsEffect(server, appLayer);

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
        const oauthServer = new OAuth2Server(oauthConfig, {
            maxSessions: OAUTH_MAX_SESSIONS,
            maxAuthorizationCodes: OAUTH_MAX_AUTH_CODES,
            cleanupIntervalMs: OAUTH_CLEANUP_INTERVAL_MS,
        });

        // Create Streamable HTTP transport with session management
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(), // Enable stateful mode
            enableJsonResponse: false, // Use SSE streaming for better MCP 2.0 support
            eventStore: new InMemoryEventStore(
                EVENT_STORE_MAX_EVENTS,
                EVENT_STORE_TTL_MS,
            ), // Enable bounded resumption within this process
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
            const requestUrl = new URL(
                req.url || "/",
                `http://${req.headers.host || "localhost"}`,
            );
            const url = requestUrl.pathname;

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
                const apiKey =
                    typeof apiKeyHeader === "string"
                        ? apiKeyHeader
                        : Array.isArray(apiKeyHeader)
                        ? apiKeyHeader[0]
                        : undefined;

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
                        try {
                            parsedBody = await parseMcpPostBody(req);
                        } catch (error) {
                            if (error instanceof McpRequestBodyError) {
                                const mappedError = mapMcpRequestBodyError(error);
                                log("Invalid MCP POST body", {
                                    code: error.code,
                                    status: mappedError.status,
                                    message: error.message,
                                });
                                res.writeHead(mappedError.status, {
                                    "Content-Type": "application/json",
                                });
                                res.end(
                                    JSON.stringify({
                                        jsonrpc: "2.0",
                                        error: {
                                            code: mappedError.jsonRpcCode,
                                            message: mappedError.message,
                                        },
                                    }),
                                );
                                return;
                            }
                            throw error;
                        }
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
                        issuer: SERVER_BASE_URL,
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
                            mcp: `${SERVER_BASE_URL}/mcp`,
                            discovery: `${SERVER_BASE_URL}/.well-known/oauth-authorization-server`,
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
                endpoint: `${SERVER_BASE_URL}/mcp`,
                protocolVersion: "2025-11-25",
                oauthEnabled: true,
                authorizationEndpoint: oauthConfig.authorizationEndpoint,
                tokenEndpoint: oauthConfig.tokenEndpoint,
            });
            console.error(
                `[Effect Patterns MCP] HTTP server started on port ${PORT}`,
            );
            console.error(
                `[Effect Patterns MCP] MCP endpoint: ${SERVER_BASE_URL}/mcp`,
            );
            console.error(
                `[Effect Patterns MCP] OAuth authorization: ${SERVER_BASE_URL}/auth`,
            );
            console.error(
                `[Effect Patterns MCP] OAuth token: ${SERVER_BASE_URL}/token`,
            );
            console.error(
                `[Effect Patterns MCP] Server info: ${SERVER_BASE_URL}/info`,
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
    if (otelSdk) {
        try { otelSdk.shutdown(); } catch { /* best-effort */ }
    }
    process.exit(0);
});

process.on("SIGTERM", () => {
    log("Received SIGTERM, shutting down");
    if (otelSdk) {
        try { otelSdk.shutdown(); } catch { /* best-effort */ }
    }
    process.exit(0);
});

main().catch((error) => {
    console.error("[Effect Patterns MCP] Fatal error:", error);
    process.exit(1);
});
