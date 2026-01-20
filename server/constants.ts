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
