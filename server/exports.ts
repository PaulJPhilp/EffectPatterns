/**
 * Server Barrel Exports
 *
 * Clean barrel file that re-exports all server functionality
 * from their respective modules.
 */

// Re-export types
export type {
    HealthCheck,
    JsonArray,
    JsonObject,
    JsonValue,
    RateLimitEntry,
    RateLimitResult,
    ServerApiResponse,
    ServerConfig,
    ServerMetrics,
    ServerRule
} from "./types.js";

// Re-export schemas
export {
    ApiResponseSchema,
    ErrorResponseSchema,
    HealthCheckSchema,
    RuleSchema,
    ServerConfigSchema,
    ServerMetricsSchema
} from "./schema.js";

// Re-export error types
export {
    ApiError,
    RuleLoadError,
    RuleNotFoundError,
    RuleParseError,
    RulesDirectoryNotFoundError,
    ServerError,
    type ServerErrorType
} from "./errors.js";

// Re-export constants
export {
    API_HEALTH,
    API_METRICS,
    API_ROOT,
    API_RULES_BY_ID,
    API_RULES_LIST,
    CACHE_CONTROL_NO_CACHE,
    CACHE_CONTROL_PUBLIC,
    DEFAULT_HOST,
    DEFAULT_LOG_LEVEL,
    DEFAULT_NODE_ENV,
    DEFAULT_PORT,
    ERROR_FAILED_TO_LOAD_RULE,
    ERROR_FAILED_TO_LOAD_RULES,
    ERROR_HEALTH_CHECK_FAILED,
    ERROR_NOT_FOUND,
    ERROR_RATE_LIMIT_EXCEEDED,
    ERROR_RULE_NOT_FOUND,
    ERROR_UNEXPECTED_ERROR,
    HEALTH_STATUS_OK,
    HEALTH_STATUS_UNHEALTHY,
    HTTP_STATUS_BAD_REQUEST,
    HTTP_STATUS_INTERNAL_SERVER_ERROR,
    HTTP_STATUS_NOT_FOUND,
    HTTP_STATUS_OK,
    HTTP_STATUS_SERVICE_UNAVAILABLE,
    HTTP_STATUS_TOO_MANY_REQUESTS,
    MEMORY_HEALTH_THRESHOLD,
    RATE_LIMIT_CONFIG,
    REQUEST_ID_LENGTH,
    RULES_DIRECTORY,
    RULES_FILE_EXTENSION,
    SECURITY_HEADERS,
    SERVER_DESCRIPTION,
    SERVER_NAME,
    SERVER_VERSION
} from "./constants.js";

// Re-export database operations
export {
    extractTitle,
    parseRuleFile,
    readAndParseRules,
    readRuleById
} from "./database.js";

// Re-export handlers
export {
    enhancedHealthHandler,
    healthHandler,
    rulesHandler,
    singleRuleHandler
} from "./handlers.js";

// Re-export utilities
export {
    addSecurityHeaders,
    createApiResponse,
    createErrorResponse,
    generateRequestId
} from "./utils.js";

// Re-export services
export { HttpServerService } from "./services/http-server/service.js";
export { MetricsService } from "./services/metrics/service.js";
export { RateLimiterService } from "./services/rate-limiter/service.js";

// Re-export main program and configuration
export { DEFAULT_CONFIG, program } from "./index.js";
