/**
 * Error types for server operations
 */

import { Data } from "effect";
import {
    HTTP_STATUS_BAD_REQUEST,
    HTTP_STATUS_NOT_FOUND,
    HTTP_STATUS_INTERNAL_SERVER_ERROR,
    HTTP_STATUS_SERVICE_UNAVAILABLE,
    ERROR_CODE_BAD_REQUEST,
    ERROR_CODE_NOT_FOUND,
    ERROR_CODE_INTERNAL_SERVER_ERROR,
    ERROR_CODE_SERVICE_UNAVAILABLE,
} from "./constants.js";

/**
 * Base API error with HTTP status mapping
 */
export class ApiError extends Data.TaggedError("ApiError")<{
    readonly message: string;
    readonly statusCode: number;
    readonly code: string;
    readonly details?: unknown;
}> {
    static make(
        message: string,
        statusCode: number,
        code: string,
        details?: unknown,
    ) {
        return new ApiError({ message, statusCode, code, details });
    }

    static badRequest(message: string, details?: unknown) {
        return ApiError.make(message, HTTP_STATUS_BAD_REQUEST, ERROR_CODE_BAD_REQUEST, details);
    }

    static notFound(message: string, details?: unknown) {
        return ApiError.make(message, HTTP_STATUS_NOT_FOUND, ERROR_CODE_NOT_FOUND, details);
    }

    static internalServerError(message: string, details?: unknown) {
        return ApiError.make(message, HTTP_STATUS_INTERNAL_SERVER_ERROR, ERROR_CODE_INTERNAL_SERVER_ERROR, details);
    }

    static serviceUnavailable(message: string, details?: unknown) {
        return ApiError.make(message, HTTP_STATUS_SERVICE_UNAVAILABLE, ERROR_CODE_SERVICE_UNAVAILABLE, details);
    }
}

/**
 * Tagged error for server-related failures
 */
export class ServerError extends Data.TaggedError("ServerError")<{
    readonly message: string;
    readonly cause?: unknown;
}> { }

/**
 * Tagged error for rule loading failures
 */
export class RuleLoadError extends Data.TaggedError("RuleLoadError")<{
    readonly path: string;
    readonly cause: unknown;
}> { }

/**
 * Tagged error for rule parsing failures
 */
export class RuleParseError extends Data.TaggedError("RuleParseError")<{
    readonly file: string;
    readonly cause: unknown;
}> { }

/**
 * Tagged error for directory not found
 */
export class RulesDirectoryNotFoundError extends Data.TaggedError(
    "RulesDirectoryNotFoundError",
)<{
    readonly path: string;
}> { }

/**
 * Tagged error for rule not found
 */
export class RuleNotFoundError extends Data.TaggedError("RuleNotFoundError")<{
    readonly id: string;
}> { }

/**
 * Union type for all server errors
 */
export type ServerErrorType =
    | ApiError
    | ServerError
    | RuleLoadError
    | RuleParseError
    | RulesDirectoryNotFoundError
    | RuleNotFoundError;
