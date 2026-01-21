/**
 * Utility functions for the server
 */

import { HttpServerResponse } from "@effect/platform";
import {
    SECURITY_HEADERS,
    RANDOM_STRING_RADIX,
    RANDOM_STRING_LENGTH,
    RANDOM_STRING_SUBSTR_START,
    DEFAULT_API_VERSION,
    HEADER_REQUEST_ID,
    HEADER_RATE_LIMIT_REMAINING,
    HEADER_RATE_LIMIT_RESET,
    HEADER_RETRY_AFTER,
} from "./constants.js";
import { ApiError } from "./errors.js";

/**
 * Generate a unique request ID
 */
export const generateRequestId = (): string => {
    return `${Date.now()}-${Math.random()
        .toString(RANDOM_STRING_RADIX)
        .substr(RANDOM_STRING_SUBSTR_START, RANDOM_STRING_LENGTH)}`;
};

/**
 * Create a standardized API response with security headers
 */
export const createApiResponse = <A>(
    data: A,
    requestId: string,
    version = DEFAULT_API_VERSION,
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
    version = DEFAULT_API_VERSION,
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
) => {
    let result = response;
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        result = result.pipe(HttpServerResponse.setHeader(key, value));
    }
    return result;
};
