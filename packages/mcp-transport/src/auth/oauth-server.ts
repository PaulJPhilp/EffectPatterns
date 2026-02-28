/**
 * OAuth 2.1 Authorization Server
 *
 * Implements OAuth 2.1 authorization server endpoints for MCP 2.0
 * with PKCE support, token management, and security best practices.
 */

import { randomBytes, timingSafeEqual } from "crypto";
import { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import {
    AuthenticatedSession,
    AuthorizationRequest,
    OAuthConfig,
    OAuthError,
    TokenRequest,
    TokenResponse,
} from "./oauth-config.js";
import { verifyPKCE } from "./pkce.js";

type AuthorizationCodeRecord = {
    clientId: string;
    redirectUri: string;
    scopes: string[];
    codeChallenge?: string;
    issuedAt: number;
    expiresAt: number;
    userId?: string;
};

type OAuth2ServerOptions = {
    now?: () => number;
    maxSessions?: number;
    maxAuthorizationCodes?: number;
    cleanupIntervalMs?: number;
};

export class OAuth2Server {
    private config: OAuthConfig;
    private readonly now: () => number;
    private readonly maxSessions: number;
    private readonly maxAuthorizationCodes: number;
    private sessions = new Map<string, AuthenticatedSession>();
    private authorizationCodes = new Map<string, AuthorizationCodeRecord>();

    constructor(config: OAuthConfig, options: OAuth2ServerOptions = {}) {
        this.config = config;
        this.now = options.now ?? Date.now;
        this.maxSessions = Math.max(1, options.maxSessions ?? 5000);
        this.maxAuthorizationCodes = Math.max(1, options.maxAuthorizationCodes ?? 5000);
        const cleanupIntervalMs = Math.max(1000, options.cleanupIntervalMs ?? 60_000);

        this.cleanupExpiredState();
        const cleanupTimer = setInterval(() => {
            try {
                this.cleanupExpiredState();
            } catch (error) {
                console.error("OAuth cleanup failed:", error);
            }
        }, cleanupIntervalMs);
        cleanupTimer.unref?.();
    }

    /**
     * Handle authorization endpoint request
     * GET /auth?response_type=code&client_id=xxx&redirect_uri=xxx&scope=xxx&state=xxx&code_challenge=xxx&code_challenge_method=S256
     */
    async handleAuthorizationRequest(
        req: IncomingMessage,
        res: ServerResponse,
    ): Promise<void> {
        try {
            this.cleanupExpiredState();
            const url = new URL(req.url!, `http://${req.headers.host}`);
            const params = this.parseAuthParams(url.searchParams);

            // Validate required parameters
            const validation = this.validateAuthorizationRequest(params);
            if (!validation.valid) {
                this.redirectWithError(
                    res,
                    params.redirectUri,
                    validation.error!,
                    params.state,
                );
                return;
            }

            // Generate authorization code
            const code = this.generateAuthorizationCode();
            const issuedAt = this.now();
            const expiresAt = issuedAt + 10 * 60 * 1000; // 10 minutes

            // Store authorization code
            this.authorizationCodes.set(code, {
                clientId: params.clientId,
                redirectUri: params.redirectUri,
                scopes: params.scope
                    ? params.scope.split(" ")
                    : this.config.defaultScopes,
                codeChallenge: params.codeChallenge,
                issuedAt,
                expiresAt,
            });
            this.enforceAuthorizationCodeLimit();

            // Redirect back to client with authorization code
            const redirectUrl = new URL(params.redirectUri);
            redirectUrl.searchParams.set("code", code);
            if (params.state) {
                redirectUrl.searchParams.set("state", params.state);
            }

            res.writeHead(302, { Location: redirectUrl.toString() });
            res.end();
        } catch (error) {
            console.error("Authorization request error:", error);
            this.sendError(
                res,
                500,
                "internal_server_error",
                "Internal server error",
            );
        }
    }

    /**
     * Handle token endpoint request
     * POST /token
     */
    async handleTokenRequest(
        req: IncomingMessage,
        res: ServerResponse,
    ): Promise<void> {
        try {
            this.cleanupExpiredState();
            const body = await this.parseRequestBody(req);
            const clientAuth = this.parseClientAuthentication(req, body);
            const params = this.parseTokenParams({
                ...body,
                client_id: clientAuth.clientId ?? body.client_id,
                client_secret: clientAuth.clientSecret ?? body.client_secret,
            });

            // Validate grant type and request
            let tokenResponse: TokenResponse;

            switch (params.grantType) {
                case "authorization_code":
                    tokenResponse = await this.handleAuthorizationCodeGrant(params);
                    break;
                case "refresh_token":
                    tokenResponse = await this.handleRefreshTokenGrant(params);
                    break;
                case "client_credentials":
                    tokenResponse = await this.handleClientCredentialsGrant(params);
                    break;
                default:
                    throw new Error("unsupported_grant_type");
            }

            // Return token response
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(tokenResponse));
        } catch (error) {
            console.error("Token request error:", error);
            const oauthError = this.mapToOAuthError(error);
            this.sendError(res, 400, oauthError.error, oauthError.errorDescription);
        }
    }

    /**
     * Middleware to validate Bearer tokens
     */
    async validateBearerToken(
        req: IncomingMessage,
    ): Promise<AuthenticatedSession | null> {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return null;
        }

        const token = authHeader.substring(7).trim();
        if (!token) {
            return null;
        }
        const session = this.sessions.get(token);
        const now = this.now();

        if (!session) {
            return null;
        }

        // Defensive cleanup for stale aliases from old token rotation behavior.
        if (session.accessToken !== token) {
            this.sessions.delete(token);
            return null;
        }

        if (session.expiresAt < now || this.isRefreshTokenExpired(session, now)) {
            this.sessions.delete(token);
            return null;
        }

        return session;
    }

    /**
     * Validate client credentials
     */
    private validateClient(clientId?: string, clientSecret?: string): boolean {
        if (!clientId || clientId !== this.config.clientId) {
            return false;
        }

        switch (this.config.tokenEndpointAuthMethod) {
            case "none":
                return true;
            case "client_secret_basic":
            case "client_secret_post": {
                if (!this.config.clientSecret || !clientSecret) {
                    return false;
                }
                return this.constantTimeEquals(clientSecret, this.config.clientSecret);
            }
            default:
                return false;
        }
    }

    /**
     * Parse and validate authorization request parameters
     */
    private parseAuthParams(searchParams: URLSearchParams): AuthorizationRequest {
        return {
            responseType: searchParams.get("response_type") as any,
            clientId: searchParams.get("client_id")!,
            redirectUri: searchParams.get("redirect_uri")!,
            scope: searchParams.get("scope") || undefined,
            state: searchParams.get("state") || undefined,
            codeChallenge: searchParams.get("code_challenge") || undefined,
            codeChallengeMethod:
                (searchParams.get("code_challenge_method") as any) || undefined,
        };
    }

    /**
     * Parse token request parameters
     */
    private parseTokenParams(body: any): TokenRequest {
        return {
            grantType: body.grant_type,
            code: body.code,
            redirectUri: body.redirect_uri,
            clientId: body.client_id,
            clientSecret: body.client_secret,
            codeVerifier: body.code_verifier,
            refreshToken: body.refresh_token,
            scope: body.scope,
        };
    }

    /**
     * Validate authorization request
     */
    private validateAuthorizationRequest(params: AuthorizationRequest): {
        valid: boolean;
        error?: OAuthError;
    } {
        if (params.responseType !== "code") {
            return {
                valid: false,
                error: {
                    error: "invalid_request",
                    errorDescription: "response_type must be code",
                },
            };
        }

        if (!params.clientId) {
            return {
                valid: false,
                error: {
                    error: "invalid_request",
                    errorDescription: "client_id is required",
                },
            };
        }

        if (params.clientId !== this.config.clientId) {
            return {
                valid: false,
                error: {
                    error: "invalid_client",
                    errorDescription: "Unknown client_id",
                },
            };
        }

        if (!params.redirectUri) {
            return {
                valid: false,
                error: {
                    error: "invalid_request",
                    errorDescription: "redirect_uri is required",
                },
            };
        }

        if (!this.config.redirectUris.includes(params.redirectUri)) {
            return {
                valid: false,
                error: {
                    error: "invalid_request",
                    errorDescription: "Invalid redirect URI",
                },
            };
        }

        // Validate PKCE if required
        if (
            this.config.requirePKCE &&
            (!params.codeChallenge || params.codeChallengeMethod !== "S256")
        ) {
            return {
                valid: false,
                error: {
                    error: "invalid_request",
                    errorDescription: "PKCE is required",
                },
            };
        }

        return { valid: true };
    }

    /**
     * Handle authorization code grant
     */
    private async handleAuthorizationCodeGrant(
        params: TokenRequest,
    ): Promise<TokenResponse> {
        this.cleanupExpiredState();
        if (!params.code) {
            throw new Error("invalid_request");
        }

        if (!this.validateClient(params.clientId, params.clientSecret)) {
            throw new Error("invalid_client");
        }

        const now = this.now();
        const authCode = this.authorizationCodes.get(params.code);
        if (!authCode || authCode.expiresAt < now) {
            throw new Error("invalid_grant");
        }

        if (params.clientId !== authCode.clientId) {
            throw new Error("invalid_grant");
        }

        // Validate redirect URI
        if (params.redirectUri && params.redirectUri !== authCode.redirectUri) {
            throw new Error("invalid_grant");
        }

        // Validate PKCE (required for OAuth 2.1 public clients)
        if (this.config.requirePKCE) {
            if (!authCode.codeChallenge || !params.codeVerifier) {
                throw new Error("invalid_grant");
            }
            if (!verifyPKCE(authCode.codeChallenge, params.codeVerifier)) {
                throw new Error("invalid_grant");
            }
        } else if (authCode.codeChallenge && params.codeVerifier) {
            if (!verifyPKCE(authCode.codeChallenge, params.codeVerifier)) {
                throw new Error("invalid_grant");
            }
        }

        // Generate tokens
        const accessToken = this.generateAccessToken();
        const refreshToken = this.generateRefreshToken();
        const expiresAt = now + this.config.accessTokenLifetime * 1000;
        const refreshTokenExpiresAt = this.getRefreshTokenExpiresAt(now);

        // Store session
        const session: AuthenticatedSession = {
            clientId: authCode.clientId,
            scopes: authCode.scopes,
            issuedAt: now,
            expiresAt,
            refreshTokenExpiresAt,
            accessToken,
            refreshToken,
        };
        this.sessions.set(accessToken, session);
        this.enforceSessionLimit();

        // Clean up authorization code
        this.authorizationCodes.delete(params.code);

        return {
            accessToken,
            tokenType: "Bearer",
            expiresIn: this.config.accessTokenLifetime,
            refreshToken,
            scope: authCode.scopes.join(" "),
        };
    }

    /**
     * Handle refresh token grant
     */
    private async handleRefreshTokenGrant(
        params: TokenRequest,
    ): Promise<TokenResponse> {
        this.cleanupExpiredState();
        if (!params.refreshToken) {
            throw new Error("invalid_request");
        }

        if (!this.validateClient(params.clientId, params.clientSecret)) {
            throw new Error("invalid_client");
        }

        const now = this.now();

        // Find sessions by refresh token
        const matches = Array.from(this.sessions.entries()).filter(
            ([, session]) => session.refreshToken === params.refreshToken,
        );
        if (matches.length === 0) {
            throw new Error("invalid_grant");
        }

        const clientMatches = matches.filter(
            ([, session]) => session.clientId === params.clientId,
        );
        if (clientMatches.length === 0) {
            throw new Error("invalid_grant");
        }

        const activeMatches = clientMatches.filter(
            ([, session]) => !this.isRefreshTokenExpired(session, now),
        );
        if (activeMatches.length === 0) {
            this.revokeSessionsByRefreshToken(params.refreshToken);
            throw new Error("invalid_grant");
        }

        const [previousAccessToken, session] = activeMatches.reduce((latest, current) =>
            current[1].issuedAt > latest[1].issuedAt ? current : latest,
        );

        // Generate new access token
        const accessToken = this.generateAccessToken();
        const expiresAt = now + this.config.accessTokenLifetime * 1000;

        // Rotate access token and invalidate old access token aliases.
        this.revokeSessionsByRefreshToken(params.refreshToken);
        session.accessToken = accessToken;
        session.expiresAt = expiresAt;
        session.issuedAt = now;
        if (previousAccessToken !== accessToken) {
            this.sessions.delete(previousAccessToken);
        }
        this.sessions.set(accessToken, session);
        this.enforceSessionLimit();

        return {
            accessToken,
            tokenType: "Bearer",
            expiresIn: this.config.accessTokenLifetime,
            refreshToken: session.refreshToken,
            scope: session.scopes.join(" "),
        };
    }

    /**
     * Handle client credentials grant
     */
    private async handleClientCredentialsGrant(
        params: TokenRequest,
    ): Promise<TokenResponse> {
        this.cleanupExpiredState();
        if (this.config.tokenEndpointAuthMethod === "none") {
            throw new Error("unauthorized_client");
        }

        if (!this.validateClient(params.clientId, params.clientSecret)) {
            throw new Error("invalid_client");
        }

        const accessToken = this.generateAccessToken();
        const now = this.now();
        const expiresAt = now + this.config.accessTokenLifetime * 1000;

        const session: AuthenticatedSession = {
            clientId: params.clientId!,
            scopes: params.scope
                ? params.scope.split(" ")
                : this.config.defaultScopes,
            issuedAt: now,
            expiresAt,
            accessToken,
        };
        this.sessions.set(accessToken, session);
        this.enforceSessionLimit();

        return {
            accessToken,
            tokenType: "Bearer",
            expiresIn: this.config.accessTokenLifetime,
            scope: session.scopes.join(" "),
        };
    }

    /**
     * Generate secure random authorization code
     */
    private generateAuthorizationCode(): string {
        return randomBytes(32).toString("hex");
    }

    /**
     * Generate secure random access token
     */
    private generateAccessToken(): string {
        return randomBytes(32).toString("hex");
    }

    /**
     * Generate secure random refresh token
     */
    private generateRefreshToken(): string {
        return randomBytes(32).toString("hex");
    }

    private getRefreshTokenExpiresAt(now: number): number | undefined {
        if (
            this.config.refreshTokenLifetime === undefined ||
            this.config.refreshTokenLifetime <= 0
        ) {
            return undefined;
        }
        return now + this.config.refreshTokenLifetime * 1000;
    }

    private isRefreshTokenExpired(
        session: AuthenticatedSession,
        now: number,
    ): boolean {
        if (!session.refreshToken || session.refreshTokenExpiresAt === undefined) {
            return false;
        }
        return session.refreshTokenExpiresAt < now;
    }

    private revokeSessionsByRefreshToken(refreshToken: string): void {
        for (const [accessToken, session] of this.sessions.entries()) {
            if (session.refreshToken === refreshToken) {
                this.sessions.delete(accessToken);
            }
        }
    }

    private enforceSessionLimit(): void {
        while (this.sessions.size > this.maxSessions) {
            let oldestToken: string | undefined;
            let oldestIssuedAt = Number.POSITIVE_INFINITY;

            for (const [token, session] of this.sessions.entries()) {
                if (session.issuedAt < oldestIssuedAt) {
                    oldestIssuedAt = session.issuedAt;
                    oldestToken = token;
                }
            }

            if (oldestToken) {
                this.sessions.delete(oldestToken);
            } else {
                break;
            }
        }
    }

    private enforceAuthorizationCodeLimit(): void {
        while (this.authorizationCodes.size > this.maxAuthorizationCodes) {
            let oldestCode: string | undefined;
            let oldestIssuedAt = Number.POSITIVE_INFINITY;

            for (const [code, authCode] of this.authorizationCodes.entries()) {
                if (authCode.issuedAt < oldestIssuedAt) {
                    oldestIssuedAt = authCode.issuedAt;
                    oldestCode = code;
                }
            }

            if (oldestCode) {
                this.authorizationCodes.delete(oldestCode);
            } else {
                break;
            }
        }
    }

    private cleanupExpiredState(): void {
        const now = this.now();

        for (const [code, authCode] of this.authorizationCodes.entries()) {
            if (authCode.expiresAt < now) {
                this.authorizationCodes.delete(code);
            }
        }

        for (const [token, session] of this.sessions.entries()) {
            const expiredAccessToken = session.expiresAt < now;
            const staleAlias = session.accessToken !== token;
            const expiredRefreshToken = this.isRefreshTokenExpired(session, now);

            if (expiredAccessToken || staleAlias || expiredRefreshToken) {
                this.sessions.delete(token);
            }
        }

        this.enforceAuthorizationCodeLimit();
        this.enforceSessionLimit();
    }

    /**
     * Parse request body
     */
    private async parseRequestBody(req: IncomingMessage): Promise<Record<string, string>> {
        return new Promise((resolve, reject) => {
            let body = "";
            req.on("data", (chunk) => (body += chunk));
            req.on("end", () => {
                try {
                    const contentTypeHeader = req.headers["content-type"];
                    const contentType = Array.isArray(contentTypeHeader)
                        ? contentTypeHeader[0] || ""
                        : contentTypeHeader || "";
                    const trimmedBody = body.trim();

                    if (!trimmedBody) {
                        resolve({});
                        return;
                    }

                    if (contentType.includes("application/x-www-form-urlencoded")) {
                        resolve(this.parseFormBody(trimmedBody));
                        return;
                    }

                    if (contentType.includes("application/json")) {
                        resolve(JSON.parse(trimmedBody) as Record<string, string>);
                        return;
                    }

                    // Fallback for clients that omit content-type
                    try {
                        resolve(JSON.parse(trimmedBody) as Record<string, string>);
                    } catch {
                        resolve(this.parseFormBody(trimmedBody));
                    }
                } catch (error) {
                    reject(error);
                }
            });
            req.on("error", reject);
        });
    }

    private parseFormBody(body: string): Record<string, string> {
        const params = new URLSearchParams(body);
        const parsed: Record<string, string> = {};

        for (const [key, value] of params.entries()) {
            parsed[key] = value;
        }

        return parsed;
    }

    private parseClientAuthentication(
        req: IncomingMessage,
        body: Record<string, string>,
    ): { clientId?: string; clientSecret?: string } {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith("Basic ")) {
            const encoded = authHeader.substring(6).trim();
            const decoded = Buffer.from(encoded, "base64").toString("utf8");
            const separatorIndex = decoded.indexOf(":");

            if (separatorIndex <= 0) {
                throw new Error("invalid_client");
            }

            const clientId = decoded.slice(0, separatorIndex);
            const clientSecret = decoded.slice(separatorIndex + 1);

            if (
                (body.client_id && body.client_id !== clientId) ||
                (body.client_secret && body.client_secret !== clientSecret)
            ) {
                throw new Error("invalid_client");
            }

            return { clientId, clientSecret };
        }

        return {
            clientId: body.client_id,
            clientSecret: body.client_secret,
        };
    }

    private constantTimeEquals(a: string, b: string): boolean {
        const aBuffer = Buffer.from(a);
        const bBuffer = Buffer.from(b);

        if (aBuffer.length !== bBuffer.length) {
            return false;
        }

        return timingSafeEqual(aBuffer, bBuffer);
    }

    /**
     * Redirect with error
     */
    private redirectWithError(
        res: ServerResponse,
        redirectUri: string,
        error: OAuthError,
        state?: string,
    ): void {
        const url = new URL(redirectUri);
        url.searchParams.set("error", error.error);
        if (error.errorDescription) {
            url.searchParams.set("error_description", error.errorDescription);
        }
        if (state) {
            url.searchParams.set("state", state);
        }

        res.writeHead(302, { Location: url.toString() });
        res.end();
    }

    /**
     * Send error response
     */
    private sendError(
        res: ServerResponse,
        status: number,
        error: string,
        description?: string,
    ): void {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(
            JSON.stringify({
                error,
                error_description: description,
            }),
        );
    }

    /**
     * Map internal errors to OAuth errors
     */
    private mapToOAuthError(error: any): OAuthError {
        const message = error.message || error;

        if (message.includes("invalid_client")) return { error: "invalid_client" };
        if (message.includes("invalid_grant")) return { error: "invalid_grant" };
        if (message.includes("unauthorized_client"))
            return { error: "unauthorized_client" };
        if (message.includes("unsupported_grant_type"))
            return { error: "unsupported_grant_type" };
        if (message.includes("invalid_scope")) return { error: "invalid_scope" };

        return { error: "invalid_request", errorDescription: message };
    }
}
