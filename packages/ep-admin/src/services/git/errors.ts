/**
 * Git service errors
 */

import { Data } from "effect";

/**
 * Error thrown when git command execution fails
 */
export class GitCommandError extends Data.TaggedError("GitCommandError")<{
	readonly command: string;
	readonly args: string[];
	readonly message: string;
	readonly cause?: unknown;
}> {
	/**
	 * Create a new git command error
	 */
	static readonly make = (
		command: string,
		args: string[],
		message: string,
		cause?: unknown
	) => new GitCommandError({ command, args, message, cause });
}

/**
 * Error thrown when git repository is not found
 */
export class GitRepositoryError extends Data.TaggedError("GitRepositoryError")<{
	readonly message: string;
	readonly path?: string;
}> {
	/**
	 * Create a new git repository error
	 */
	static readonly make = (message: string, path?: string) =>
		new GitRepositoryError({ message, path });
}

/**
 * Error thrown when git operation is not allowed
 */
export class GitOperationError extends Data.TaggedError("GitOperationError")<{
	readonly operation: string;
	readonly reason: string;
}> {
	/**
	 * Create a new git operation error
	 */
	static readonly make = (operation: string, reason: string) =>
		new GitOperationError({ operation, reason });
}
