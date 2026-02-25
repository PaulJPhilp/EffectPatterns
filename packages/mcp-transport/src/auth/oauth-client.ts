/**
 * OAuth 2.1 Client Example
 *
 * Demonstrates how to authenticate with the MCP 2.0 server using OAuth 2.1
 * with PKCE (Proof Key for Code Exchange) as required by OAuth 2.1.
 */

import { generatePKCE } from "./pkce.js";

export class OAuth2Client {
    private clientId: string;
    private redirectUri: string;
    private authorizationEndpoint: string;
    private tokenEndpoint: string;

    constructor(config: {
        clientId: string;
        redirectUri: string;
        authorizationEndpoint: string;
        tokenEndpoint: string;
    }) {
        this.clientId = config.clientId;
        this.redirectUri = config.redirectUri;
        this.authorizationEndpoint = config.authorizationEndpoint;
        this.tokenEndpoint = config.tokenEndpoint;
    }

    /**
     * Generate authorization URL with PKCE
     */
    generateAuthorizationUrl(scopes: string[] = [], state?: string): string {
        const pkce = generatePKCE();

        const params = new URLSearchParams({
            response_type: "code",
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            scope: scopes.join(" "),
            code_challenge: pkce.codeChallenge,
            code_challenge_method: pkce.codeChallengeMethod,
        });

        if (state) {
            params.append("state", state);
        }

        // Store PKCE verifier for token exchange (in production, use secure storage)
        sessionStorage.setItem("oauth_pkce_verifier", pkce.codeVerifier);
        if (state) {
            sessionStorage.setItem("oauth_state", state);
        }

        return `${this.authorizationEndpoint}?${params.toString()}`;
    }

    /**
     * Exchange authorization code for access token
     */
    async exchangeCodeForToken(authorizationCode: string): Promise<{
        access_token: string;
        token_type: string;
        expires_in: number;
        refresh_token?: string;
        scope: string;
    }> {
        const codeVerifier = sessionStorage.getItem("oauth_pkce_verifier");
        if (!codeVerifier) {
            throw new Error("PKCE verifier not found");
        }

        const response = await fetch(this.tokenEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code: authorizationCode,
                redirect_uri: this.redirectUri,
                client_id: this.clientId,
                code_verifier: codeVerifier,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Token exchange failed: ${error}`);
        }

        const tokenData = await response.json() as {
            access_token: string;
            token_type: string;
            expires_in: number;
            refresh_token?: string;
            scope: string;
        };

        // Clear PKCE verifier
        sessionStorage.removeItem("oauth_pkce_verifier");
        sessionStorage.removeItem("oauth_state");

        return tokenData;
    }

    /**
     * Refresh access token
     */
    async refreshToken(refreshToken: string): Promise<{
        access_token: string;
        token_type: string;
        expires_in: number;
        refresh_token?: string;
        scope: string;
    }> {
        const response = await fetch(this.tokenEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: refreshToken,
                client_id: this.clientId,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Token refresh failed: ${error}`);
        }

        return response.json() as Promise<{
            access_token: string;
            token_type: string;
            expires_in: number;
            refresh_token?: string;
            scope: string;
        }>;
    }

    /**
     * Make authenticated request to MCP endpoint
     */
    async makeMCPRequest(accessToken: string, payload: any): Promise<any> {
        const response = await fetch("http://localhost:3001/mcp", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
                "MCP-Protocol-Version": "2025-11-25",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`MCP request failed: ${error}`);
        }

        return response.json();
    }
}

// Example usage:
/*
const oauthClient = new OAuth2Client({
  clientId: "effect-patterns-mcp",
  redirectUri: "http://localhost:3000/callback",
  authorizationEndpoint: "http://localhost:3001/auth",
  tokenEndpoint: "http://localhost:3001/token",
});

// Step 1: Redirect user to authorization
const authUrl = oauthClient.generateAuthorizationUrl(
  ["mcp:access", "patterns:read"],
  "random-state-string"
);
window.location.href = authUrl;

// Step 2: Handle callback and exchange code for token
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get("code");
const state = urlParams.get("state");

if (code && state === sessionStorage.getItem("oauth_state")) {
  const tokens = await oauthClient.exchangeCodeForToken(code);
  
  // Step 3: Make authenticated MCP request
  const mcpResponse = await oauthClient.makeMCPRequest(tokens.access_token, {
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
      name: "search_patterns",
      arguments: { q: "service" }
    },
    id: 1
  });
}
*/
