/**
 * API Barrel Exports
 *
 * Clean barrel file that re-exports all API functionality
 * from their respective modules.
 */

// Re-export types
export type {
  ApiDocumentation,
  ApiResponse,
  ApiRule,
  ErrorResponse,
  HealthCheck,
  JsonArray,
  JsonObject,
  JsonValue
} from "./types.js";

// Re-export schemas
export {
  ApiDocumentationSchema,
  ErrorResponseSchema,
  HealthCheckSchema,
  RuleSchema,
  SuccessResponseSchema
} from "./schema.js";

// Re-export error types
export { ApiError, DatabaseError, RuleNotFoundError } from "./errors.js";

// Re-export constants
export {
  API_DESCRIPTION,
  API_HEALTH,
  API_NAME,
  API_REPOSITORY,
  API_ROOT,
  API_RULES_BY_ID,
  API_RULES_LIST,
  API_VERSION,
  DEFAULT_API_BASE_URL,
  DEFAULT_ENVIRONMENT,
  ERROR_FAILED_TO_LOAD_RULE,
  ERROR_FAILED_TO_LOAD_RULES,
  ERROR_NOT_FOUND,
  ERROR_RULE_NOT_FOUND,
  ERROR_UNEXPECTED_ERROR,
  HEALTH_STATUS_OK,
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_OK,
  PERFORMANCE_TIMEOUT_MS,
  RULE_PATH_REGEX
} from "./constants.js";

// Re-export services
export { DatabaseService } from "./services/database/service.js";
export { HandlersService } from "./services/handlers/service.js";

// Re-export the main Vercel handler
export { default } from "./server.js";
