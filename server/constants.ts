/**
 * Server configuration constants
 */

// HTTP Status Codes
export const HTTP_STATUS_OK = 200;
export const HTTP_STATUS_NOT_FOUND = 404;
export const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;
export const HTTP_STATUS_BAD_REQUEST = 400;
export const HTTP_STATUS_SERVICE_UNAVAILABLE = 503;
export const HTTP_STATUS_TOO_MANY_REQUESTS = 429;

// API Routes
export const API_ROOT = "/";
export const API_HEALTH = "/health";
export const API_METRICS = "/metrics";
export const API_RULES_LIST = "/api/v1/rules";
export const API_RULES_BY_ID = "/api/v1/rules/{id}";

// Rate Limiting Configuration
export const RATE_LIMIT_CONFIG = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // requests per window
} as const;

// Server Configuration
export const DEFAULT_PORT = 3001;
export const DEFAULT_HOST = "localhost";
export const DEFAULT_NODE_ENV = "development";
export const DEFAULT_LOG_LEVEL = "info";

// Error Messages
export const ERROR_RULE_NOT_FOUND = "Rule not found";
export const ERROR_FAILED_TO_LOAD_RULES = "Failed to load rules from directory";
export const ERROR_FAILED_TO_LOAD_RULE = "Failed to load rule from file";
export const ERROR_UNEXPECTED_ERROR = "Unexpected error occurred";
export const ERROR_NOT_FOUND = "Not found";
export const ERROR_RATE_LIMIT_EXCEEDED = "Rate limit exceeded";
export const ERROR_HEALTH_CHECK_FAILED = "Health check failed";

// Health Status
export const HEALTH_STATUS_OK = "ok";
export const HEALTH_STATUS_UNHEALTHY = "unhealthy";

// Server Metadata
export const SERVER_NAME = "Effect Patterns Server";
export const SERVER_VERSION = "1.0.0";
export const SERVER_DESCRIPTION =
    "Production-ready HTTP API server for Effect-TS patterns";

// Cache Headers
export const CACHE_CONTROL_NO_CACHE = "no-cache";
export const CACHE_CONTROL_PUBLIC = "public, max-age=300"; // 5 minutes

// Security Headers
export const SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
} as const;

// File System Paths
export const RULES_DIRECTORY = "rules/cursor";
export const RULES_FILE_EXTENSION = ".mdc";

// Request ID Generation
export const REQUEST_ID_LENGTH = 9;

// Memory Thresholds
export const MEMORY_HEALTH_THRESHOLD = 0.9; // 90% of heap used

// Network Configuration
export const MAX_PORT = 65535;
export const MIN_PORT = 0;

// Client IP (Default for local requests)
export const DEFAULT_CLIENT_IP = "127.0.0.1";

// Memory Unit Conversion
export const BYTES_PER_MB = 1024 * 1024;
export const BYTES_PER_KB = 1024;

// Random String Generation
export const RANDOM_STRING_RADIX = 36;
export const RANDOM_STRING_LENGTH = 9;
export const RANDOM_STRING_SUBSTR_START = 2;

// API Response Versioning
export const DEFAULT_API_VERSION = "v1";

// Health Check Status
export const HEALTH_STATUS_HEALTHY = "healthy";

// HTTP Header Names
export const HEADER_REQUEST_ID = "X-Request-ID";
export const HEADER_RATE_LIMIT_REMAINING = "X-RateLimit-Remaining";
export const HEADER_RATE_LIMIT_RESET = "X-RateLimit-Reset";
export const HEADER_RETRY_AFTER = "Retry-After";

// Error Codes
export const ERROR_CODE_BAD_REQUEST = "BAD_REQUEST";
export const ERROR_CODE_NOT_FOUND = "NOT_FOUND";
export const ERROR_CODE_INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR";
export const ERROR_CODE_SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE";
export const ERROR_CODE_RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED";
