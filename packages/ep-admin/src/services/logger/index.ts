/**
 * Logger service barrel exports
 */

// Service
export { logDebug, logError, Logger, LoggerDefault, LoggerLive, logInfo, logSuccess, logWarn, makeLogger } from "./service.js";

// Types
export { defaultLoggerConfig, LOG_LEVEL_VALUES, LogLevelPriority, parseLogLevel } from "./types.js";
export type { LoggerConfig, LogLevel, OutputFormat } from "./types.js";

// API
export type { LoggerService } from "./api.js";

// Errors
export { LogFormatError, LoggerConfigError } from "./errors.js";

// Helpers
export { formatMessage, ICONS, writeOutput } from "./helpers.js";

