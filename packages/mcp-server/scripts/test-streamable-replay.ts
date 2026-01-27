#!/usr/bin/env bun
/**
 * Streamable HTTP replay test (local)
 *
 * Runs an OAuth PKCE flow against the local MCP server, performs a few calls,
 * then simulates a reconnect to validate replay behavior.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import crypto from "crypto";

const SERVER_URL = process.env.MCP_SERVER_URL || "http://localhost:3004/mcp";
const AUTH_URL = process.env.MCP_AUTH_URL || "http://localhost:3004/auth";
const TOKEN_URL = process.env.MCP_TOKEN_URL || "http://localhost:3004/token";
const REDIRECT_URI =
  process.env.MCP_REDIRECT_URI || "http://localhost:3000/callback";

process.on("unhandledRejection", (error) => {
  const name = error instanceof Error ? error.name : "";
  const msg = error instanceof Error ? error.message : String(error);
  if (name === "AbortError" || msg.includes("aborted")) {
    return;
  }
  console.error("[replay-test] unhandled rejection:", error);
  process.exit(1);
});

function makePkce() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return { verifier, challenge };
}

async function getAuthCode(pkce: { verifier: string; challenge: string }) {
  const authUrl = new URL(AUTH_URL);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", "effect-patterns-mcp");
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("scope", "mcp:access patterns:read");
  authUrl.searchParams.set("state", "replay-test");
  authUrl.searchParams.set("code_challenge", pkce.challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  const res = await fetch(authUrl, { redirect: "manual" });
  const location = res.headers.get("location");
  if (!location) {
    throw new Error("No redirect location from /auth");
  }

  const redirect = new URL(location);
  const code = redirect.searchParams.get("code");
  if (!code) {
    throw new Error("No code in redirect");
  }

  return code;
}

async function exchangeToken(code: string, verifier: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: "effect-patterns-mcp",
      code_verifier: verifier,
    }),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status}`);
  }
  return res.json() as Promise<{
    accessToken: string;
  }>;
}

async function main() {
  const pkce = makePkce();
  const code = await getAuthCode(pkce);
  const token = await exchangeToken(code, pkce.verifier);

  const authProvider: OAuthClientProvider = {
    redirectUrl: undefined,
    clientMetadata: {
      client_name: "streamable-replay-test",
      redirect_uris: [REDIRECT_URI],
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "client_secret_post",
    },
    clientInformation: async () => ({
      client_id: "effect-patterns-mcp",
    }),
    tokens: async () => ({
      access_token: token.accessToken,
      token_type: "Bearer",
    }),
    saveTokens: async () => {},
    redirectToAuthorization: async () => {},
    saveCodeVerifier: async () => {},
    codeVerifier: async () => pkce.verifier,
  };

  const transport = new StreamableHTTPClientTransport(new URL(SERVER_URL), {
    authProvider,
    reconnectionOptions: {
      maxAttempts: 1,
      baseDelayMs: 100,
      maxDelayMs: 200,
      jitterFactor: 0,
    },
  });

  const client = new Client({ name: "replay-test", version: "0.0.1" });
  await client.connect(transport);

  await client.listTools();
  await client.callTool({
    name: "search_patterns",
    arguments: { q: "retry", limit: 5 },
  });

  // Wait for server-side SSE drop to trigger reconnect.
  await new Promise((resolve) => setTimeout(resolve, 1500));

  try {
    await client.listTools();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (!msg.includes("Server already initialized")) {
      throw error;
    }
  }

  await client.close();
}

main().catch((error) => {
  const name = error instanceof Error ? error.name : "";
  const msg = error instanceof Error ? error.message : String(error);
  if (name === "AbortError" || msg.includes("aborted")) {
    return;
  }
  console.error("[replay-test] failed:", error);
  process.exit(1);
});
