/**
 * Type definitions for the API
 */

/**
 * Represents a rule/pattern in the API response
 */
export interface ApiRule {
    id: string;
    title: string;
    description: string;
    content: string;
    skillLevel?: string;
    useCase?: string[];
}

/**
 * API documentation response structure
 */
export interface ApiDocumentation {
    name: string;
    version: string;
    description: string;
    repository: string;
    endpoints: {
        health: string;
        rules: {
            list: string;
            get: string;
        };
    };
}

/**
 * Health check response structure
 */
export interface HealthCheck {
    status: string;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
    error: string;
}

/**
 * Generic success response with data
 */
export interface SuccessResponse<T> {
    data: T;
}

/**
 * HTTP response wrapper for API responses
 */
export interface ApiResponse<T = any> {
    status: number;
    data?: T;
    error?: string;
}

/**
 * JSON serializable types
 */
export type JsonValue =
    | string
    | number
    | boolean
    | null
    | JsonObject
    | JsonArray;

export interface JsonObject {
    [key: string]: JsonValue;
}

export interface JsonArray extends Array<JsonValue> { }

/**
 * Type guard to check if a value is JSON serializable
 */
export function isJsonValue(value: unknown): value is JsonValue {
    if (
        value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
    ) {
        return true;
    }

    if (Array.isArray(value)) {
        return value.every(isJsonValue);
    }

    if (typeof value === "object" && value !== null) {
        return Object.values(value).every(isJsonValue);
    }

    return false;
}
