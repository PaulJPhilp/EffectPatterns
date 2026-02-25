/**
 * Tagged error types for ep-admin CLI
 *
 * Provides type-safe, tagged errors following Effect-TS patterns.
 * These errors enable precise error handling and clear user feedback.
 */

import { Data } from "effect";

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
// Validation Errors
// =============================================================================

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
