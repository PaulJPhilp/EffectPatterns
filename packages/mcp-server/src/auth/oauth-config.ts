/**
 * OAuth 2.1 Authorization Configuration
 *
 * Implements OAuth 2.1 authorization server configuration for MCP 2.0
 * following RFC 6749 (OAuth 2.0) and OAuth 2.1 security best practices.
 */

export interface OAuthConfig {
    // Authorization server configuration
    authorizationEndpoint: string;
    tokenEndpoint: string;
    userInfoEndpoint?: string;

    // Client configuration
    clientId: string;
    clientSecret?: string; // For confidential clients
    redirectUris: string[];

    // Scopes and permissions
    defaultScopes: string[];
    supportedScopes: string[];

    // Security settings
    requirePKCE: boolean; // OAuth 2.1 recommendation
    tokenEndpointAuthMethod:
    | "client_secret_basic"
    | "client_secret_post"
    | "none";

    // Session settings
    accessTokenLifetime: number; // seconds
    refreshTokenLifetime?: number; // seconds
    idTokenLifetime?: number; // seconds
}

export interface AuthorizationRequest {
    responseType: "code";
    clientId: string;
    redirectUri: string;
    scope?: string;
    state?: string;
    codeChallenge?: string; // PKCE
    codeChallengeMethod?: "S256"; // PKCE
}

export interface TokenRequest {
    grantType: "authorization_code" | "refresh_token" | "client_credentials";
    code?: string;
    redirectUri?: string;
    clientId?: string;
    clientSecret?: string;
    codeVerifier?: string; // PKCE
    refreshToken?: string;
    scope?: string;
}

export interface TokenResponse {
    accessToken: string;
    tokenType: "Bearer";
    expiresIn: number;
    refreshToken?: string;
    scope?: string;
    idToken?: string; // OpenID Connect
}

export interface OAuthError {
    error:
    | "invalid_request"
    | "invalid_client"
    | "invalid_grant"
    | "unauthorized_client"
    | "unsupported_grant_type"
    | "invalid_scope";
    errorDescription?: string;
    errorUri?: string;
    state?: string;
}

export interface AuthenticatedSession {
    clientId: string;
    userId?: string;
    scopes: string[];
    expiresAt: number;
    accessToken: string;
    refreshToken?: string;
}
