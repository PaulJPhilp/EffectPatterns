/**
 * Utility functions for the server
 */

import { HttpServerResponse } from "@effect/platform";
import { ApiError } from "./errors.js";

/**
 * Generate a unique request ID
 */
export const generateRequestId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create a standardized API response with security headers
 */
export const createApiResponse = <A>(
    data: A,
    requestId: string,
    version = "v1",
) => ({
    success: true,
    data,
    meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version,
    },
});

/**
 * Create a standardized error response with security headers
 */
export const createErrorResponse = (
    error: ApiError,
    requestId: string,
    version = "v1",
) => ({
    success: false,
    error: {
        message: error.message,
        code: error.code,
        details: error.details,
    },
    meta: {
        timestamp: new Date().toISOString(),
        requestId,
        version,
    },
});

/**
 * Add security headers to a response
 */
export const addSecurityHeaders = (
    response: HttpServerResponse.HttpServerResponse,
) =>
    response.pipe(
        HttpServerResponse.setHeader("X-Content-Type-Options", "nosniff"),
        HttpServerResponse.setHeader("X-Frame-Options", "DENY"),
        HttpServerResponse.setHeader("X-XSS-Protection", "1; mode=block"),
        HttpServerResponse.setHeader(
            "Referrer-Policy",
            "strict-origin-when-cross-origin",
        ),
        HttpServerResponse.setHeader(
            "Permissions-Policy",
            "geolocation=(), microphone=(), camera=()",
        ),
    );
