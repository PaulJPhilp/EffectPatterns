# OAuth 2.1 Authorization for MCP 2.0

This document describes the OAuth 2.1 authorization framework implementation for the Effect Patterns MCP 2.0 server.

## Overview

The MCP 2.0 Streamable HTTP transport is now secured with OAuth 2.1 authorization, providing:

- **PKCE (Proof Key for Code Exchange)** - Required for public clients per OAuth 2.1
- **Bearer Token Authentication** - Secure access to MCP endpoints
- **Token Management** - Access and refresh token lifecycle
- **Scope-based Authorization** - Granular permission control
- **Security Best Practices** - Following OAuth 2.1 security guidelines

## Architecture

### Components

1. **OAuth2Server** (`src/auth/oauth-server.ts`)
   - Authorization endpoint (`/auth`)
   - Token endpoint (`/token`)
   - Bearer token validation
   - Session management

2. **OAuth2Client** (`src/auth/oauth-client.ts`)
   - PKCE generation
   - Authorization URL creation
   - Token exchange
   - Refresh token handling

3. **PKCE Support** (`src/auth/pkce.ts`)
   - Code verifier/challenge generation
   - SHA256-based challenge verification

## Configuration

### OAuth 2.1 Settings

```typescript
const oauthConfig: OAuthConfig = {
  authorizationEndpoint: "http://localhost:3001/auth",
  tokenEndpoint: "http://localhost:3001/token",
  clientId: "effect-patterns-mcp",
  redirectUris: [
    "http://localhost:3000/callback",
    "http://localhost:3001/callback",
    "https://effect-patterns.com/callback",
  ],
  defaultScopes: ["mcp:access", "patterns:read"],
  supportedScopes: ["mcp:access", "patterns:read", "patterns:write", "analysis:run"],
  requirePKCE: true, // OAuth 2.1 requirement
  tokenEndpointAuthMethod: "client_secret_basic",
  accessTokenLifetime: 3600, // 1 hour
  refreshTokenLifetime: 86400, // 24 hours
};
```

### Scopes

| Scope | Description | Required For |
|-------|-------------|---------------|
| `mcp:access` | Basic MCP protocol access | All MCP operations |
| `patterns:read` | Read pattern information | `get_pattern`, `search_patterns` |
| `patterns:write` | Modify patterns | `generate_pattern_code` |
| `analysis:run` | Run code analysis | `analyze_code`, `review_code` |

## Endpoints

### 1. Authorization Endpoint

```
GET /auth?response_type=code&client_id=xxx&redirect_uri=xxx&scope=xxx&state=xxx&code_challenge=xxx&code_challenge_method=S256
```

**Parameters:**

- `response_type=code` (required)
- `client_id` (required)
- `redirect_uri` (required)
- `scope` (optional)
- `state` (recommended)
- `code_challenge` (required - PKCE)
- `code_challenge_method=S256` (required)

**Response:** Redirect to `redirect_uri` with authorization code

### 2. Token Endpoint

```
POST /token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=xxx&redirect_uri=xxx&client_id=xxx&code_verifier=xxx
```

**Parameters:**

- `grant_type=authorization_code` (required)
- `code` (required)
- `redirect_uri` (required)
- `client_id` (required)
- `code_verifier` (required - PKCE)

**Response:**

```json
{
  "access_token": "xxx",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "xxx",
  "scope": "mcp:access patterns:read"
}
```

### 3. MCP Endpoint (Protected)

```
POST /mcp
Authorization: Bearer xxx
MCP-Protocol-Version: 2025-11-25
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "search_patterns",
    "arguments": { "q": "service" }
  },
  "id": 1
}
```

### 4. Discovery Endpoints

#### Server Information

```
GET /info
```

Returns server capabilities and OAuth configuration.

#### OAuth Discovery

```
GET /.well-known/oauth-authorization-server
```

Returns OAuth server metadata per RFC 8414.

## Authentication Flow

### Step 1: Initiate Authorization

```typescript
import { OAuth2Client } from "./auth/oauth-client.js";

const oauthClient = new OAuth2Client({
  clientId: "effect-patterns-mcp",
  redirectUri: "http://localhost:3000/callback",
  authorizationEndpoint: "http://localhost:3001/auth",
  tokenEndpoint: "http://localhost:3001/token",
});

// Generate authorization URL with PKCE
const authUrl = oauthClient.generateAuthorizationUrl(
  ["mcp:access", "patterns:read"],
  "random-state-string"
);

// Redirect user to authorization
window.location.href = authUrl;
```

### Step 2: Handle Authorization Callback

```typescript
// Extract authorization code from callback
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get("code");
const state = urlParams.get("state");

// Verify state matches
if (state === sessionStorage.getItem("oauth_state")) {
  // Exchange code for access token
  const tokens = await oauthClient.exchangeCodeForToken(code);
  
  // Store tokens securely
  localStorage.setItem("access_token", tokens.access_token);
  localStorage.setItem("refresh_token", tokens.refresh_token);
}
```

### Step 3: Make Authenticated MCP Request

```typescript
const accessToken = localStorage.getItem("access_token");

const mcpResponse = await oauthClient.makeMCPRequest(accessToken, {
  jsonrpc: "2.0",
  method: "tools/call",
  params: {
    name: "search_patterns",
    arguments: { q: "service" }
  },
  id: 1
});
```

### Step 4: Refresh Access Token

```typescript
const refreshToken = localStorage.getItem("refresh_token");

if (refreshToken) {
  const newTokens = await oauthClient.refreshToken(refreshToken);
  
  // Update stored tokens
  localStorage.setItem("access_token", newTokens.access_token);
  if (newTokens.refresh_token) {
    localStorage.setItem("refresh_token", newTokens.refresh_token);
  }
}
```

## Security Features

### OAuth 2.1 Compliance

1. **PKCE Required** - All authorization requests must include PKCE
2. **Secure Token Storage** - Tokens stored in memory with expiration
3. **Scope Validation** - MCP operations validated against token scopes
4. **State Parameter** - CSRF protection via state parameter
5. **Origin Validation** - DNS rebinding protection

### Token Security

- **Access Tokens**: 1-hour expiration, bearer format
- **Refresh Tokens**: 24-hour expiration, single-use
- **Session Management**: Automatic cleanup of expired tokens
- **Token Binding**: Tokens associated with client ID and scopes

### Request Security

- **Bearer Token Validation**: All MCP requests require valid tokens
- **Origin Header Validation**: Prevents DNS rebinding attacks
- **Protocol Version Headers**: MCP 2.0 version negotiation
- **Rate Limiting**: Configurable rate limits per client

## Error Handling

### OAuth Errors

| Error | Description | Resolution |
|-------|-------------|------------|
| `invalid_request` | Missing or invalid parameters | Check request format |
| `invalid_client` | Unknown client ID | Verify client registration |
| `invalid_grant` | Invalid authorization code | Request new authorization |
| `unauthorized_client` | Client not authorized | Check client permissions |
| `unsupported_grant_type` | Unsupported grant type | Use supported grant types |
| `invalid_scope` | Invalid or insufficient scope | Request valid scopes |

### MCP Errors

| Error | Description | Resolution |
|-------|-------------|------------|
| `-32001` | Unauthorized - missing or invalid token | Obtain valid access token |
| `-32600` | Invalid request | Check request format |
| `-32603` | Internal server error | Retry or contact support |

## Testing

### Start OAuth-enabled MCP Server

```bash
# Start server with OAuth 2.1
npm run mcp:http:debug

# Server will start on http://localhost:3001
# Endpoints:
# - /auth - OAuth authorization
# - /token - OAuth token exchange  
# - /mcp - MCP protocol (protected)
# - /info - Server information
# - /.well-known/oauth-authorization-server - OAuth discovery
```

### Test Authorization Flow

```bash
# 1. Get server info
curl http://localhost:3001/info

# 2. Initiate authorization (PKCE required)
curl "http://localhost:3001/auth?response_type=code&client_id=effect-patterns-mcp&redirect_uri=http://localhost:3000/callback&scope=mcp:access patterns:read&state=test&code_challenge=xyz&code_challenge_method=S256"

# 3. Exchange code for token (using returned code)
curl -X POST http://localhost:3001/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=AUTH_CODE&redirect_uri=http://localhost:3000/callback&client_id=effect-patterns-mcp&code_verifier=CODE_VERIFIER"

# 4. Make authenticated MCP request
curl -X POST http://localhost:3001/mcp \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "MCP-Protocol-Version: 2025-11-25" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_patterns","arguments":{"q":"service"}},"id":1}'
```

## Migration from Stdio

To migrate from stdio transport to OAuth-protected HTTP:

1. **Update Client**: Replace stdio transport with OAuth2Client
2. **Add Authorization**: Implement OAuth 2.1 flow
3. **Update Requests**: Add Bearer token headers
4. **Handle Errors**: Update error handling for OAuth errors
5. **Token Management**: Implement refresh token logic

## Best Practices

1. **Use HTTPS** in production for all OAuth endpoints
2. **Validate State** parameter to prevent CSRF
3. **Secure Storage** for tokens (use secure HTTP-only cookies in production)
4. **Short Token Lifetimes** (access tokens: 1 hour, refresh tokens: 24 hours)
5. **Scope Limitation** - request minimum required scopes
6. **Token Revocation** - implement token revocation endpoint
7. **Rate Limiting** - prevent abuse of OAuth endpoints
8. **Audit Logging** - log all OAuth events for security monitoring

## Development Notes

- PKCE is mandatory for all clients (OAuth 2.1 requirement)
- Tokens are stored in-memory and expire automatically
- Client authentication uses client_secret_basic method
- Authorization codes expire after 10 minutes
- Refresh tokens are single-use and issue new refresh tokens
- All OAuth endpoints follow RFC 6749 and OAuth 2.1 security best practices
