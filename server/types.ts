/**
 * Type definitions for the server
 */

/**
 * Represents a rule/pattern in the server response
 */
export interface ServerRule {
    id: string;
    title: string;
    description: string;
    content: string;
    skillLevel?: string;
    useCase?: string[];
}

/**
 * Server configuration interface
 */
export interface ServerConfig {
    port: number;
    host: string;
    nodeEnv: "development" | "staging" | "production";
    logLevel: "debug" | "info" | "warn" | "error";
}

/**
 * Rate limit entry for tracking requests per IP
 */
export interface RateLimitEntry {
    readonly count: number;
    readonly resetTime: number;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
    readonly allowed: boolean;
    readonly remaining: number;
    readonly resetTime?: number;
}

/**
 * API response wrapper for server responses
 */
export interface ServerApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        code: string;
        details?: unknown;
    };
    meta: {
        timestamp: string;
        requestId: string;
        version: string;
    };
}

/**
 * Health check response structure
 */
export interface HealthCheck {
    status: string;
    timestamp: string;
    uptime: string;
    memory: {
        used: string;
        total: string;
        healthy: boolean;
    };
    filesystem: {
        rulesFileExists: boolean;
    };
    services: {
        rules: boolean;
    };
    version: string;
}

/**
 * Server metrics structure
 */
export interface ServerMetrics {
    server: {
        uptime: number;
        startTime: string;
        version: string;
        environment: string;
    };
    requests: {
        total: number;
        errors: number;
        rateLimitHits: number;
    };
    health: {
        lastHealthCheck: string;
        healthCheckAge: number;
    };
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
