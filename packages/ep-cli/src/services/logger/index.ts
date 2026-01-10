/**
 * Logger service barrel exports
 */

// Service
export { Logger, LoggerDefault, LoggerLive, logDebug, logError, logInfo, logSuccess, logWarn, makeLogger } from "./service.js";

// Types
export { LOG_LEVEL_VALUES, LogLevelPriority, defaultLoggerConfig, parseLogLevel } from "./types.js";
export type { LogLevel, LoggerConfig, OutputFormat } from "./types.js";

// API
export type { LoggerService } from "./api.js";

// Errors
export { LogFormatError, LoggerConfigError } from "./errors.js";

// Helpers
export { ICONS, formatMessage, writeOutput } from "./helpers.js";

