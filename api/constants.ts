/**
 * API constants
 */

// HTTP Status Codes
export const HTTP_STATUS_OK = 200;
export const HTTP_STATUS_NOT_FOUND = 404;
export const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;

// API Routes
export const API_ROOT = "/";
export const API_HEALTH = "/health";
export const API_RULES_LIST = "/api/v1/rules";
export const API_RULES_BY_ID = "/api/v1/rules/{id}";

// Route Patterns
export const RULE_PATH_REGEX = /^\/api\/v1\/rules\/([^/]+)$/;

// API Metadata
export const API_NAME = "Effect Patterns API";
export const API_VERSION = "v1";
export const API_DESCRIPTION = "AI coding rules for Effect-TS patterns";
export const API_REPOSITORY = "https://github.com/PaulJPhilp/EffectPatterns";

// Error Messages
export const ERROR_RULE_NOT_FOUND = "Rule not found";
export const ERROR_FAILED_TO_LOAD_RULES = "Failed to load rules from database";
export const ERROR_FAILED_TO_LOAD_RULE = "Failed to load rule from database";
export const ERROR_UNEXPECTED_ERROR = "Unexpected error occurred";
export const ERROR_NOT_FOUND = "Not found";

// Health Status
export const HEALTH_STATUS_OK = "ok";

// Test Configuration
export const DEFAULT_API_BASE_URL = "http://localhost:3000";
export const DEFAULT_ENVIRONMENT = "node";
export const PERFORMANCE_TIMEOUT_MS = 5000;
