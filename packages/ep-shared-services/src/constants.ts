/**
 * Global constants and types for Effect Patterns project
 * 
 * This file centralizes all magic numbers, strings, and types used across
 * the Effect Patterns codebase to improve maintainability and consistency.
 */

// =============================================================================
// TIME CONSTANTS
// =============================================================================

/**
 * Default timeout values in milliseconds
 */
export const TIME_CONSTANTS = {
	/** Default script execution timeout */
	DEFAULT_SCRIPT_TIMEOUT: 30000,
	/** TypeScript compilation timeout */
	TYPESC_TIMEOUT: 10000,
	/** Command execution timeout */
	COMMAND_TIMEOUT: 5000,
	/** Search operation timeout */
	SEARCH_TIMEOUT: 5000,
	/** Load operation timeout */
	LOAD_TIMEOUT: 10000,
	/** Cache TTL in milliseconds (5 minutes) */
	CACHE_TTL_MS: 300000,
	/** Cache cleanup interval (1 minute) */
	CACHE_CLEANUP_INTERVAL_MS: 60000,
	/** Validation timeout */
	VALIDATION_TIMEOUT_MS: 5000,
} as const;

/**
 * Time constants in seconds
 */
export const TIME_SECONDS = {
	ONE_MINUTE: 60,
	FIVE_MINUTES: 300,
	ONE_HOUR: 3600,
	ONE_DAY: 86400,
} as const;

// =============================================================================
// FILE EXTENSIONS
// =============================================================================

/**
 * File extensions used throughout the project
 */
export const FILE_EXTENSIONS = {
	/** TypeScript files */
	TS: ".ts",
	/** JavaScript files */
	JS: ".js",
	/** JSON files */
	JSON: ".json",
	/** Markdown with JSX */
	MDX: ".mdx",
	/** Markdown files */
	MD: ".md",
	/** Shell scripts */
	SH: ".sh",
	/** Configuration files */
	CONFIG: ".config",
	/** Lock files */
	LOCK: ".lock",
} as const;

// =============================================================================
// LOG LEVELS
// =============================================================================

/**
 * Log levels in order of severity (lowest to highest)
 */
export const LOG_LEVEL_VALUES = {
	ALL: "all",
	TRACE: "trace",
	DEBUG: "debug",
	INFO: "info",
	WARNING: "warning",
	WARN: "warn",
	ERROR: "error",
	FATAL: "fatal",
	SILENT: "silent",
	NONE: "none",
} as const;

/**
 * Log level priority for filtering
 */
export const LOG_LEVEL_PRIORITY = {
	[LOG_LEVEL_VALUES.ALL]: 0,
	[LOG_LEVEL_VALUES.TRACE]: 1,
	[LOG_LEVEL_VALUES.DEBUG]: 2,
	[LOG_LEVEL_VALUES.INFO]: 3,
	[LOG_LEVEL_VALUES.WARNING]: 4,
	[LOG_LEVEL_VALUES.WARN]: 4,
	[LOG_LEVEL_VALUES.ERROR]: 5,
	[LOG_LEVEL_VALUES.FATAL]: 6,
	[LOG_LEVEL_VALUES.SILENT]: 7,
	[LOG_LEVEL_VALUES.NONE]: 8,
} as const;

/**
 * Display message types
 */
export const DISPLAY_TYPES = {
	INFO: "info",
	SUCCESS: "success",
	WARNING: "warning",
	WARN: "warn",
	ERROR: "error",
	HIGHLIGHT: "highlight",
} as const;

/**
 * Panel display types
 */
export const PANEL_TYPES = {
	INFO: "info",
	SUCCESS: "success",
	ERROR: "error",
	WARNING: "warning",
} as const;

// =============================================================================
// EXECUTION COMMANDS
// =============================================================================

/**
 * Default execution commands
 */
export const EXECUTION_COMMANDS = {
	/** Default script runner */
	SCRIPT_RUNNER: "bun",
	/** Alternative script runner */
	NODE_RUNNER: "node",
	/** TypeScript compiler */
	TYPESC_COMPILER: "npx tsc",
	/** Test runner */
	TEST_RUNNER: "npx vitest",
	/** Package manager */
	PACKAGE_MANAGER: "npm",
} as const;

/**
 * Execution command arguments
 */
export const EXECUTION_ARGS = {
	RUN: ["run"],
	NO_EMIT: ["--noEmit"],
	VERBOSE: ["--verbose"],
	SILENT: ["--silent"],
} as const;

// =============================================================================
// VALIDATION CONSTANTS
// =============================================================================

/**
 * Validation limits and ranges
 */
export const VALIDATION_CONSTANTS = {
	/** Maximum search results */
	MAX_SEARCH_RESULTS: 10000,
	/** Maximum cache size */
	MAX_CACHE_SIZE: 100000,
	/** Minimum port number */
	MIN_PORT: 1,
	/** Maximum port number */
	MAX_PORT: 65535,
	/** Default maximum search results */
	DEFAULT_MAX_SEARCH_RESULTS: 100,
	/** Default maximum cache size */
	DEFAULT_MAX_CACHE_SIZE: 1000,
} as const;

/**
 * Validation severity levels
 */
export const VALIDATION_SEVERITY = {
	ERROR: "error",
	WARNING: "warning",
	INFO: "info",
} as const;

// =============================================================================
// SHELL TYPES
// =============================================================================

/**
 * Supported shell types for completions
 */
export const SHELL_TYPES = {
	BASH: "bash",
	ZSH: "zsh",
	FISH: "fish",
	SH: "sh",
} as const;

// =============================================================================
// CLI CONSTANTS
// =============================================================================

/**
 * CLI names and descriptions
 */
export const CLI_CONSTANTS = {
	/** ep-admin CLI name */
	EP_ADMIN: "ep-admin",
	/** ep-admin CLI description */
	EP_ADMIN_DESCRIPTION: "Administrative CLI for Effect Patterns maintainers",
	/** ep-cli CLI name */
	EP_CLI: "ep",
	/** ep-cli CLI description */
	EP_CLI_DESCRIPTION: "A CLI for Effect Patterns Hub",
	/** ep-admin runner name */
	EP_ADMIN_RUNNER: "ep-admin",
	/** ep-cli runner name */
	EP_CLI_RUNNER: "ep",
} as const;

// =============================================================================
// PATH CONSTANTS
// =============================================================================

/**
 * Common directory names
 */
export const PATH_CONSTANTS = {
	/** Content directories */
	CONTENT: "content",
	/** New content directory */
	NEW: "new",
	/** Raw content directory */
	RAW: "raw",
	/** Processed content directory */
	PROCESSED: "processed",
	/** Published content directory */
	PUBLISHED: "published",
	/** Source directory */
	SRC: "src",
	/** Distribution directory */
	DIST: "dist",
	/** Test directory */
	TEST: "test",
	/** Tests directory */
	TESTS: "__tests__",
	/** Documentation directory */
	DOCS: "docs",
	/** Configuration directory */
	CONFIG: "config",
	/** Build directory */
	BUILD: "build",
	/** Coverage directory */
	COVERAGE: "coverage",
	/** Node modules directory */
	NODE_MODULES: "node_modules",
} as const;

/**
 * File and directory patterns
 */
export const FILE_PATTERNS = {
	/** Pattern files */
	PATTERN_FILES: "*.mdx",
	/** TypeScript files */
	TS_FILES: "*.ts",
	/** JavaScript files */
	JS_FILES: "*.js",
	/** JSON files */
	JSON_FILES: "*.json",
	/** Configuration files */
	CONFIG_FILES: "*.config.*",
	/** Lock files */
	LOCK_FILES: "*.lock",
	/** Test files */
	TEST_FILES: "*.test.*",
	/** Coverage files */
	COVERAGE_FILES: "*.coverage.*",
} as const;

// =============================================================================
// HTTP CONSTANTS
// =============================================================================

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
	OK: 200,
	CREATED: 201,
	NO_CONTENT: 204,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	INTERNAL_SERVER_ERROR: 500,
	SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * HTTP methods
 */
export const HTTP_METHODS = {
	GET: "GET",
	POST: "POST",
	PUT: "PUT",
	DELETE: "DELETE",
	PATCH: "PATCH",
	HEAD: "HEAD",
	OPTIONS: "OPTIONS",
} as const;

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Log level type
 */
export type LogLevel = typeof LOG_LEVEL_VALUES[keyof typeof LOG_LEVEL_VALUES];

/**
 * Display type
 */
export type DisplayType = typeof DISPLAY_TYPES[keyof typeof DISPLAY_TYPES];

/**
 * Panel type
 */
export type PanelType = typeof PANEL_TYPES[keyof typeof PANEL_TYPES];

/**
 * Validation severity type
 */
export type ValidationSeverity = typeof VALIDATION_SEVERITY[keyof typeof VALIDATION_SEVERITY];

/**
 * Shell type
 */
export type ShellType = typeof SHELL_TYPES[keyof typeof SHELL_TYPES];

/**
 * File extension type
 */
export type FileExtension = typeof FILE_EXTENSIONS[keyof typeof FILE_EXTENSIONS];

/**
 * CLI name type
 */
export type CLIName = typeof CLI_CONSTANTS[keyof typeof CLI_CONSTANTS];

/**
 * Path constant type
 */
export type PathConstant = typeof PATH_CONSTANTS[keyof typeof PATH_CONSTANTS];

/**
 * File pattern type
 */
export type FilePattern = typeof FILE_PATTERNS[keyof typeof FILE_PATTERNS];

/**
 * HTTP status code type
 */
export type HttpStatus = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];

/**
 * HTTP method type
 */
export type HttpMethod = typeof HTTP_METHODS[keyof typeof HTTP_METHODS];

/**
 * Time constant type
 */
export type TimeConstant = typeof TIME_CONSTANTS[keyof typeof TIME_CONSTANTS];

/**
 * Validation constant type
 */
export type ValidationConstant = typeof VALIDATION_CONSTANTS[keyof typeof VALIDATION_CONSTANTS];

/**
 * Execution command type
 */
export type ExecutionCommand = typeof EXECUTION_COMMANDS[keyof typeof EXECUTION_COMMANDS];

/**
 * Execution argument type
 */
export type ExecutionArg = typeof EXECUTION_ARGS[keyof typeof EXECUTION_ARGS];

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Check if a value is a valid log level
 */
export const isValidLogLevel = (level: string): level is LogLevel => {
	return Object.values(LOG_LEVEL_VALUES).includes(level as LogLevel);
};

/**
 * Check if a value is a valid display type
 */
export const isValidDisplayType = (type: string): type is DisplayType => {
	return Object.values(DISPLAY_TYPES).includes(type as DisplayType);
};

/**
 * Check if a value is a valid panel type
 */
export const isValidPanelType = (type: string): type is PanelType => {
	return Object.values(PANEL_TYPES).includes(type as PanelType);
};

/**
 * Check if a value is a valid validation severity
 */
export const isValidValidationSeverity = (severity: string): severity is ValidationSeverity => {
	return Object.values(VALIDATION_SEVERITY).includes(severity as ValidationSeverity);
};

/**
 * Check if a value is a valid shell type
 */
export const isValidShellType = (shell: string): shell is ShellType => {
	return Object.values(SHELL_TYPES).includes(shell as ShellType);
};

/**
 * Check if a file extension is valid
 */
export const isValidFileExtension = (ext: string): ext is FileExtension => {
	return Object.values(FILE_EXTENSIONS).includes(ext as FileExtension);
};

/**
 * Check if a CLI name is valid
 */
export const isValidCLIName = (name: string): name is CLIName => {
	return Object.values(CLI_CONSTANTS).includes(name as CLIName);
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Convert milliseconds to seconds
 */
export const msToSeconds = (ms: number): number => Math.floor(ms / 1000);

/**
 * Convert seconds to milliseconds
 */
export const secondsToMs = (seconds: number): number => seconds * 1000;

/**
 * Format duration in human readable format
 */
export const formatDuration = (ms: number): string => {
	const seconds = msToSeconds(ms);
	if (seconds < 60) {
		return `${seconds}s`;
	}
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) {
		return `${minutes}m ${seconds % 60}s`;
	}
	const hours = Math.floor(minutes / 60);
	if (hours < 24) {
		return `${hours}h ${minutes % 60}m`;
	}
	const days = Math.floor(hours / 24);
	return `${days}d ${hours % 24}h`;
};

/**
 * Format file size in human readable format
 */
export const formatFileSize = (bytes: number): string => {
	const units = ["B", "KB", "MB", "GB", "TB"];
	let size = bytes;
	let unitIndex = 0;

	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}

	return `${size.toFixed(1)} ${units[unitIndex]}`;
};

/**
 * Check if a timeout value is reasonable
 */
export const isReasonableTimeout = (timeout: number): boolean => {
	return timeout > 0 && timeout <= 300000; // 5 minutes max
};

/**
 * Check if a port number is valid
 */
export const isValidPort = (port: number): boolean => {
	return Number.isInteger(port) && port >= VALIDATION_CONSTANTS.MIN_PORT && port <= VALIDATION_CONSTANTS.MAX_PORT;
};

/**
 * Get the default timeout for a given operation type
 */
export const getDefaultTimeout = (operation: "script" | "typescript" | "command" | "search" | "load"): number => {
	switch (operation) {
		case "script":
			return TIME_CONSTANTS.DEFAULT_SCRIPT_TIMEOUT;
		case "typescript":
			return TIME_CONSTANTS.TYPESC_TIMEOUT;
		case "command":
			return TIME_CONSTANTS.COMMAND_TIMEOUT;
		case "search":
			return TIME_CONSTANTS.SEARCH_TIMEOUT;
		case "load":
			return TIME_CONSTANTS.LOAD_TIMEOUT;
		default:
			return TIME_CONSTANTS.DEFAULT_SCRIPT_TIMEOUT;
	}
};
