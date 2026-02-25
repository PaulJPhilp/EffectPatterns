import { describe, expect, it } from "vitest";
import type { OAuthConfig } from "../oauth-config";
import { OAuth2Server } from "../oauth-server";
import { generatePKCE } from "../pkce";

const publicClientConfig: OAuthConfig = {
  authorizationEndpoint: "http://localhost:3001/auth",
  tokenEndpoint: "http://localhost:3001/token",
  clientId: "test-client",
  redirectUris: ["http://localhost:3000/callback"],
  defaultScopes: ["mcp:access"],
  supportedScopes: ["mcp:access"],
  requirePKCE: true,
  tokenEndpointAuthMethod: "none",
  accessTokenLifetime: 3600,
  refreshTokenLifetime: 86400,
};

describe("OAuth2Server PKCE enforcement", () => {
  it("rejects authorization code exchange when code_verifier is missing", async () => {
    const server = new OAuth2Server(publicClientConfig) as any;
    const pkce = generatePKCE();

    server.authorizationCodes.set("test-code", {
      clientId: "test-client",
      redirectUri: "http://localhost:3000/callback",
      scopes: ["mcp:access"],
      codeChallenge: pkce.codeChallenge,
      expiresAt: Date.now() + 60_000,
    });

    await expect(
      server.handleAuthorizationCodeGrant({
        grantType: "authorization_code",
        clientId: "test-client",
        code: "test-code",
        redirectUri: "http://localhost:3000/callback",
      }),
    ).rejects.toThrow("invalid_grant");
  });

  it("rejects authorization code exchange with wrong code_verifier", async () => {
    const server = new OAuth2Server(publicClientConfig) as any;
    const pkce = generatePKCE();

    server.authorizationCodes.set("test-code", {
      clientId: "test-client",
      redirectUri: "http://localhost:3000/callback",
      scopes: ["mcp:access"],
      codeChallenge: pkce.codeChallenge,
      expiresAt: Date.now() + 60_000,
    });

    await expect(
      server.handleAuthorizationCodeGrant({
        grantType: "authorization_code",
        clientId: "test-client",
        code: "test-code",
        redirectUri: "http://localhost:3000/callback",
        codeVerifier: "not-the-right-verifier",
      }),
    ).rejects.toThrow("invalid_grant");
  });

  it("accepts authorization code exchange with correct code_verifier", async () => {
    const server = new OAuth2Server(publicClientConfig) as any;
    const pkce = generatePKCE();

    server.authorizationCodes.set("test-code", {
      clientId: "test-client",
      redirectUri: "http://localhost:3000/callback",
      scopes: ["mcp:access"],
      codeChallenge: pkce.codeChallenge,
      expiresAt: Date.now() + 60_000,
    });

    const token = await server.handleAuthorizationCodeGrant({
      grantType: "authorization_code",
      clientId: "test-client",
      code: "test-code",
      redirectUri: "http://localhost:3000/callback",
      codeVerifier: pkce.codeVerifier,
    });

    expect(token.accessToken).toBeTruthy();
    expect(token.tokenType).toBe("Bearer");
  });

  it("rejects authorization code exchange with wrong client_id", async () => {
    const server = new OAuth2Server(publicClientConfig) as any;
    const pkce = generatePKCE();

    server.authorizationCodes.set("test-code", {
      clientId: "test-client",
      redirectUri: "http://localhost:3000/callback",
      scopes: ["mcp:access"],
      codeChallenge: pkce.codeChallenge,
      expiresAt: Date.now() + 60_000,
    });

    await expect(
      server.handleAuthorizationCodeGrant({
        grantType: "authorization_code",
        clientId: "different-client",
        code: "test-code",
        redirectUri: "http://localhost:3000/callback",
        codeVerifier: pkce.codeVerifier,
      }),
    ).rejects.toThrow("invalid_client");
  });
});

describe("OAuth2Server client auth enforcement", () => {
  it("rejects client_credentials when token auth method is none", async () => {
    const server = new OAuth2Server(publicClientConfig) as any;

    await expect(
      server.handleClientCredentialsGrant({
        grantType: "client_credentials",
        clientId: "test-client",
      }),
    ).rejects.toThrow("unauthorized_client");
  });

  it("requires matching client secret for client_secret_basic method", async () => {
    const confidentialConfig: OAuthConfig = {
      ...publicClientConfig,
      tokenEndpointAuthMethod: "client_secret_basic",
      clientSecret: "super-secret",
    };
    const server = new OAuth2Server(confidentialConfig) as any;

    await expect(
      server.handleClientCredentialsGrant({
        grantType: "client_credentials",
        clientId: "test-client",
        clientSecret: "wrong-secret",
      }),
    ).rejects.toThrow("invalid_client");

    const token = await server.handleClientCredentialsGrant({
      grantType: "client_credentials",
      clientId: "test-client",
      clientSecret: "super-secret",
    });

    expect(token.accessToken).toBeTruthy();
    expect(token.tokenType).toBe("Bearer");
  });

  it("rejects authorization request for unknown client", () => {
    const server = new OAuth2Server(publicClientConfig) as any;
    const validation = server.validateAuthorizationRequest({
      responseType: "code",
      clientId: "unknown-client",
      redirectUri: "http://localhost:3000/callback",
      codeChallenge: "abc",
      codeChallengeMethod: "S256",
    });

    expect(validation.valid).toBe(false);
    expect(validation.error?.error).toBe("invalid_client");
  });
});

describe("OAuth2Server token lifecycle hardening", () => {
  it("invalidates old access token after refresh rotation", async () => {
    const server = new OAuth2Server(publicClientConfig) as any;
    const pkce = generatePKCE();

    server.authorizationCodes.set("rotation-code", {
      clientId: "test-client",
      redirectUri: "http://localhost:3000/callback",
      scopes: ["mcp:access"],
      codeChallenge: pkce.codeChallenge,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 60_000,
    });

    const initial = await server.handleAuthorizationCodeGrant({
      grantType: "authorization_code",
      clientId: "test-client",
      code: "rotation-code",
      redirectUri: "http://localhost:3000/callback",
      codeVerifier: pkce.codeVerifier,
    });

    const oldTokenReq = {
      headers: {
        authorization: `Bearer ${initial.accessToken}`,
      },
    };
    const oldTokenBeforeRefresh = await server.validateBearerToken(oldTokenReq);
    expect(oldTokenBeforeRefresh).not.toBeNull();

    const rotated = await server.handleRefreshTokenGrant({
      grantType: "refresh_token",
      clientId: "test-client",
      refreshToken: initial.refreshToken,
    });

    expect(rotated.accessToken).not.toBe(initial.accessToken);

    const oldTokenAfterRefresh = await server.validateBearerToken(oldTokenReq);
    expect(oldTokenAfterRefresh).toBeNull();

    const newTokenReq = {
      headers: {
        authorization: `Bearer ${rotated.accessToken}`,
      },
    };
    const newTokenSession = await server.validateBearerToken(newTokenReq);
    expect(newTokenSession).not.toBeNull();
  });

  it("rejects refresh token exchange after refresh token expiry", async () => {
    let now = Date.now();
    const shortRefreshConfig: OAuthConfig = {
      ...publicClientConfig,
      refreshTokenLifetime: 1,
    };
    const server = new OAuth2Server(shortRefreshConfig, {
      now: () => now,
      cleanupIntervalMs: 3600_000,
    }) as any;
    const pkce = generatePKCE();

    server.authorizationCodes.set("expiry-code", {
      clientId: "test-client",
      redirectUri: "http://localhost:3000/callback",
      scopes: ["mcp:access"],
      codeChallenge: pkce.codeChallenge,
      issuedAt: now,
      expiresAt: now + 60_000,
    });

    const issued = await server.handleAuthorizationCodeGrant({
      grantType: "authorization_code",
      clientId: "test-client",
      code: "expiry-code",
      redirectUri: "http://localhost:3000/callback",
      codeVerifier: pkce.codeVerifier,
    });

    now += 1_100;

    await expect(
      server.handleRefreshTokenGrant({
        grantType: "refresh_token",
        clientId: "test-client",
        refreshToken: issued.refreshToken,
      }),
    ).rejects.toThrow("invalid_grant");

    expect(server.sessions.size).toBe(0);
  });
});
