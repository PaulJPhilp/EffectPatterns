/**
 * Handlers service types
 */

/**
 * API response structure
 */
export interface ApiResponse<T = any> {
    readonly data?: T;
    readonly error?: string;
    readonly statusCode: number;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
    readonly status: string;
}
