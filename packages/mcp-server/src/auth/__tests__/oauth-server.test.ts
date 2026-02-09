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
