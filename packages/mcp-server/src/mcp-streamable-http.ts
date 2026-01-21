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
import { createServer } from "http";
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

// OAuth 2.1 Configuration
const oauthConfig: OAuthConfig = {
    authorizationEndpoint: `http://localhost:${PORT}/auth`,
    tokenEndpoint: `http://localhost:${PORT}/token`,
    clientId: "effect-patterns-mcp",
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
    tokenEndpointAuthMethod: "client_secret_basic",
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
        "MCP-Protocol-Version": "2025-11-25", // MCP 2.0 protocol version
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

    log(`API ${method} ${endpoint}`, data);

    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            const errorText = await response.text();
            log(`API Error: HTTP ${response.status}`);
            return {
                ok: false,
                error: errorText || `HTTP ${response.status}`,
                status: response.status,
            };
        }

        const result = await response.json();
        log(`API Response`, result);
        return { ok: true, data: result };
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        log(`API Error`, msg);
        return { ok: false, error: msg };
    }
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

registerTools(server, callApi, log);

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
                await oauthServer.handleAuthorizationRequest(req, res);
                return;
            }

            if (url.startsWith("/token")) {
                await oauthServer.handleTokenRequest(req, res);
                return;
            }

            // MCP endpoint with OAuth protection
            if (url === "/mcp" && (req.method === "POST" || req.method === "GET")) {
                // Validate OAuth token
                const session = await oauthServer.validateBearerToken(req);
                if (!session) {
                    log("Unauthorized MCP request - missing or invalid token");
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
                                message: "Unauthorized - valid OAuth token required",
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
                        sessionId: session.clientId,
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
                res.setHeader("X-OAuth-Client-ID", session.clientId);
                res.setHeader("X-OAuth-Scopes", session.scopes.join(" "));

                try {
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
                    log("Request handling error", { error, sessionId: session.clientId });
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
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                    JSON.stringify({
                        issuer: `http://localhost:${PORT}`,
                        authorization_endpoint: oauthConfig.authorizationEndpoint,
                        token_endpoint: oauthConfig.tokenEndpoint,
                        response_types_supported: ["code"],
                        grant_types_supported: ["authorization_code", "refresh_token"],
                        scopes_supported: oauthConfig.supportedScopes,
                        token_endpoint_auth_methods_supported: ["client_secret_basic"],
                        code_challenge_methods_supported: ["S256"],
                        require_pkce: oauthConfig.requirePKCE,
                    }),
                );
                return;
            }

            // Server info endpoint
            if (url === "/info") {
                res.writeHead(200, { "Content-Type": "application/json" });
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
