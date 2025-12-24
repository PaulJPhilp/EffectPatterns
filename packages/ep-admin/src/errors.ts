/**
 * Tagged error types for ep-admin CLI
 *
 * Provides type-safe, tagged errors following Effect-TS patterns.
 * These errors enable precise error handling and clear user feedback.
 */

import { Data } from "effect";

// =============================================================================
// Validation Errors
// =============================================================================

/**
 * Error for invalid CLI option values
 */
export class OptionValidationError extends Data.TaggedError(
    "OptionValidationError"
)<{
    readonly option: string;
    readonly message: string;
    readonly value?: unknown;
    readonly expected?: string;
}> {
    get formattedMessage(): string {
        const base = `Invalid value for --${this.option}: ${this.message}`;
        if (this.expected) {
            return `${base} (expected: ${this.expected})`;
        }
        return base;
    }
}

/**
 * Error for invalid CLI argument values
 */
export class ArgumentValidationError extends Data.TaggedError(
    "ArgumentValidationError"
)<{
    readonly argument: string;
    readonly message: string;
    readonly value?: unknown;
    readonly expected?: string;
}> {
    get formattedMessage(): string {
        const base = `Invalid argument '${this.argument}': ${this.message}`;
        if (this.expected) {
            return `${base} (expected: ${this.expected})`;
        }
        return base;
    }
}

/**
 * Error for schema validation failures
 */
export class SchemaValidationError extends Data.TaggedError(
    "SchemaValidationError"
)<{
    readonly field: string;
    readonly message: string;
    readonly value?: unknown;
    readonly path?: ReadonlyArray<string>;
}> {
    get formattedMessage(): string {
        const pathStr = this.path?.length ? ` at ${this.path.join(".")}` : "";
        return `Validation error${pathStr}: ${this.message}`;
    }
}

// =============================================================================
// File System Errors
// =============================================================================

/**
 * Error when a required file is not found
 */
export class FileNotFoundError extends Data.TaggedError("FileNotFoundError")<{
    readonly path: string;
    readonly operation: string;
}> {
    get formattedMessage(): string {
        return `File not found during ${this.operation}: ${this.path}`;
    }
}

/**
 * Error when file read/write operations fail
 */
export class FileOperationError extends Data.TaggedError("FileOperationError")<{
    readonly path: string;
    readonly operation: "read" | "write" | "delete" | "copy" | "move";
    readonly cause?: unknown;
}> {
    get formattedMessage(): string {
        return `Failed to ${this.operation} file: ${this.path}`;
    }
}

/**
 * Error when a directory is not found
 */
export class DirectoryNotFoundError extends Data.TaggedError(
    "DirectoryNotFoundError"
)<{
    readonly path: string;
    readonly operation: string;
}> {
    get formattedMessage(): string {
        return `Directory not found during ${this.operation}: ${this.path}`;
    }
}

// =============================================================================
// Configuration Errors
// =============================================================================

/**
 * Error when a required configuration value is missing
 */
export class ConfigMissingError extends Data.TaggedError("ConfigMissingError")<{
    readonly key: string;
    readonly source?: string;
}> {
    get formattedMessage(): string {
        const sourceStr = this.source ? ` (from ${this.source})` : "";
        return `Missing required configuration: ${this.key}${sourceStr}`;
    }
}

/**
 * Error when a configuration value is invalid
 */
export class ConfigInvalidError extends Data.TaggedError("ConfigInvalidError")<{
    readonly key: string;
    readonly message: string;
    readonly value?: unknown;
}> {
    get formattedMessage(): string {
        return `Invalid configuration for '${this.key}': ${this.message}`;
    }
}

// =============================================================================
// Execution Errors
// =============================================================================

/**
 * Error when a script/command execution fails
 */
export class ExecutionError extends Data.TaggedError("ExecutionError")<{
    readonly command: string;
    readonly exitCode: number;
    readonly stderr?: string;
    readonly stdout?: string;
}> {
    get formattedMessage(): string {
        return `Command failed with exit code ${this.exitCode}: ${this.command}`;
    }
}

/**
 * Error when a command times out
 */
export class TimeoutError extends Data.TaggedError("TimeoutError")<{
    readonly command: string;
    readonly timeoutMs: number;
}> {
    get formattedMessage(): string {
        return `Command timed out after ${this.timeoutMs}ms: ${this.command}`;
    }
}

// =============================================================================
// API/Network Errors
// =============================================================================

/**
 * Error for API request failures
 */
export class ApiError extends Data.TaggedError("ApiError")<{
    readonly endpoint: string;
    readonly statusCode: number;
    readonly message: string;
    readonly body?: unknown;
}> {
    get formattedMessage(): string {
        return `API error (${this.statusCode}) at ${this.endpoint}: ${this.message}`;
    }
}

/**
 * Error for network connectivity issues
 */
export class NetworkError extends Data.TaggedError("NetworkError")<{
    readonly url: string;
    readonly cause?: unknown;
}> {
    get formattedMessage(): string {
        return `Network error connecting to: ${this.url}`;
    }
}

// =============================================================================
// Pipeline/Process Errors
// =============================================================================

/**
 * Error when a pipeline step fails
 */
export class PipelineStepError extends Data.TaggedError("PipelineStepError")<{
    readonly step: string;
    readonly pipeline: string;
    readonly message: string;
    readonly cause?: unknown;
}> {
    get formattedMessage(): string {
        return `Pipeline '${this.pipeline}' failed at step '${this.step}': ${this.message}`;
    }
}

/**
 * Error when a pattern validation fails
 */
export class PatternValidationError extends Data.TaggedError(
    "PatternValidationError"
)<{
    readonly patternId: string;
    readonly issues: ReadonlyArray<string>;
}> {
    get formattedMessage(): string {
        return `Pattern '${this.patternId}' validation failed:\n${this.issues.map((i) => `  - ${i}`).join("\n")}`;
    }
}

// =============================================================================
// User Input Errors
// =============================================================================

/**
 * Error when user cancels an interactive prompt
 */
export class UserCancelledError extends Data.TaggedError("UserCancelledError")<{
    readonly operation: string;
}> {
    get formattedMessage(): string {
        return `Operation cancelled by user: ${this.operation}`;
    }
}

/**
 * Error when user provides invalid input in a prompt
 */
export class InvalidInputError extends Data.TaggedError("InvalidInputError")<{
    readonly prompt: string;
    readonly message: string;
    readonly value?: unknown;
}> {
    get formattedMessage(): string {
        return `Invalid input for '${this.prompt}': ${this.message}`;
    }
}

// =============================================================================
// Type Unions for Error Handling
// =============================================================================

/**
 * All validation-related errors
 */
export type ValidationErrors =
    | OptionValidationError
    | ArgumentValidationError
    | SchemaValidationError
    | PatternValidationError;

/**
 * All file system-related errors
 */
export type FileSystemErrors =
    | FileNotFoundError
    | FileOperationError
    | DirectoryNotFoundError;

/**
 * All configuration-related errors
 */
export type ConfigErrors = ConfigMissingError | ConfigInvalidError;

/**
 * All execution-related errors
 */
export type ExecutionErrors = ExecutionError | TimeoutError;

/**
 * All network-related errors
 */
export type NetworkErrors = ApiError | NetworkError;

/**
 * All user input-related errors
 */
export type UserInputErrors = UserCancelledError | InvalidInputError;

/**
 * All CLI errors combined
 */
export type CLIError =
    | ValidationErrors
    | FileSystemErrors
    | ConfigErrors
    | ExecutionErrors
    | NetworkErrors
    | PipelineStepError
    | UserInputErrors;
