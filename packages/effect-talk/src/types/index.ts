import { Data, Schema } from "effect";

// ============================================================================
// Domain Types
// ============================================================================

export type BlockStatus =
    | "idle"
    | "running"
    | "success"
    | "failure"
    | "interrupted";

export interface Block {
    readonly id: string;
    readonly command: string;
    readonly status: BlockStatus;
    readonly exitCode?: number;
    readonly stdout: string;
    readonly stderr: string;
    readonly startTime: number;
    readonly endTime?: number;
    readonly metadata: Record<string, unknown>;
}

export interface Session {
    readonly id: string;
    readonly blocks: Block[];
    readonly activeBlockId: string | null;
    readonly workingDirectory: string;
    readonly environment: Record<string, string>;
    readonly createdAt: number;
    readonly lastModified: number;
}

export interface EffectTalkConfig {
    readonly sessionStorePath: string;
    readonly maxHistorySize: number;
    readonly debounceMs: number;
    readonly ptyCols: number;
    readonly ptyRows: number;
}

// ============================================================================
// Schema Definitions (@effect/schema)
// ============================================================================

export const BlockStatusSchema = Schema.Union(
    Schema.Literal("idle"),
    Schema.Literal("running"),
    Schema.Literal("success"),
    Schema.Literal("failure"),
    Schema.Literal("interrupted"),
);

export const BlockSchema = Schema.Struct({
    id: Schema.String,
    command: Schema.String,
    status: BlockStatusSchema,
    exitCode: Schema.Optional(Schema.Number),
    stdout: Schema.String,
    stderr: Schema.String,
    startTime: Schema.Number,
    endTime: Schema.Optional(Schema.Number),
    metadata: Schema.Record(Schema.String, Schema.Unknown),
});

export const SessionSchema = Schema.Struct({
    id: Schema.String,
    blocks: Schema.Array(BlockSchema),
    activeBlockId: Schema.Nullable(Schema.String),
    workingDirectory: Schema.String,
    environment: Schema.Record(Schema.String, Schema.String),
    createdAt: Schema.Number,
    lastModified: Schema.Number,
});

export const EffectTalkConfigSchema = Schema.Struct({
    sessionStorePath: Schema.String,
    maxHistorySize: Schema.Number.pipe(Schema.filter((n) => n > 0)),
    debounceMs: Schema.Number.pipe(Schema.filter((n) => n >= 0)),
    ptyCols: Schema.Number.pipe(Schema.filter((n) => n > 0)),
    ptyRows: Schema.Number.pipe(Schema.filter((n) => n > 0)),
});

// ============================================================================
// Error Types (Effect.Data.TaggedError)
// ============================================================================

export class ProcessError extends Data.TaggedError("ProcessError")<{
    readonly reason: "spawn-failed" | "timeout" | "killed";
    readonly pid?: number;
    readonly cause?: unknown;
}> { }

export class PersistenceError extends Data.TaggedError("PersistenceError")<{
    readonly operation: "read" | "write" | "delete";
    readonly path: string;
    readonly cause?: unknown;
}> { }

export class ValidationError extends Data.TaggedError("ValidationError")<{
    readonly field: string;
    readonly message: string;
    readonly value?: unknown;
}> { }

export class SessionError extends Data.TaggedError("SessionError")<{
    readonly sessionId: string;
    readonly message: string;
}> { }

export class BlockError extends Data.TaggedError("BlockError")<{
    readonly blockId: string;
    readonly message: string;
}> { }

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a UUID v4-like string (simplified)
 */
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Format a timestamp as a readable string
 */
export function formatTimestamp(ms: number): string {
    return new Date(ms).toLocaleString();
}

/**
 * Format elapsed time in milliseconds to a readable duration
 */
export function formatDuration(ms: number): string {
    if (ms < 1000) {
        return `${ms}ms`;
    }
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
        return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
}

/**
 * Parse a command string to detect if it's a slash command or shell command
 */
export function parseCommand(input: string): {
    type: "slash" | "shell";
    command: string;
    args: string[];
} {
    const trimmed = input.trim();

    if (trimmed.startsWith("/")) {
        const parts = trimmed.substring(1).split(/\s+/);
        return {
            type: "slash",
            command: parts[0] || "",
            args: parts.slice(1),
        };
    }

    return {
        type: "shell",
        command: trimmed,
        args: [],
    };
}

/**
 * Escape a string for safe shell execution
 */
export function escapeShellArg(arg: string): string {
    return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Format byte count to human-readable format
 */
export function formatBytes(bytes: number): string {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// TODO: Create Schema definitions for runtime validation
