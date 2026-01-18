/**
 * Enhanced FileSystem service with better error messages
 *
 * Wraps @effect/platform FileSystem with improved error handling,
 * context, and user-friendly messages.
 */

import { FileSystem as EffectFileSystem } from "@effect/platform";
import { Effect } from "effect";
import {
	DirectoryNotFoundError,
	FileNotFoundError,
	FileOperationError,
} from "../../errors.js";

/**
 * Enhanced FileSystem service interface
 */
export interface EnhancedFileSystem {
	readonly readFile: (
		path: string,
		context?: string
	) => Effect.Effect<string, FileOperationError | FileNotFoundError, EffectFileSystem.FileSystem>;

	readonly writeFile: (
		path: string,
		content: string,
		context?: string
	) => Effect.Effect<void, FileOperationError | DirectoryNotFoundError, EffectFileSystem.FileSystem>;

	readonly ensureDirectory: (
		path: string
	) => Effect.Effect<void, DirectoryNotFoundError | FileOperationError, EffectFileSystem.FileSystem>;

	readonly fileExists: (path: string) => Effect.Effect<boolean, FileOperationError, EffectFileSystem.FileSystem>;
}

/**
 * Create enhanced FileSystem service
 */
export const createEnhancedFileSystem = (): Effect.Effect<EnhancedFileSystem, never, EffectFileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* EffectFileSystem.FileSystem;

		const readFile = (
			path: string,
			context?: string
		): Effect.Effect<string, FileOperationError | FileNotFoundError, EffectFileSystem.FileSystem> =>
			Effect.gen(function* () {
				const fs = yield* EffectFileSystem.FileSystem;
				return yield* fs
					.readFileString(path)
					.pipe(
						Effect.catchAll((error): Effect.Effect<string, FileOperationError | FileNotFoundError, EffectFileSystem.FileSystem> => {
							// Check if it's a "not found" error
							const errorMessage = String(error);
							if (
								errorMessage.includes("ENOENT") ||
								errorMessage.includes("not found")
							) {
								return Effect.fail(
									new FileNotFoundError({
										path,
										operation: context || "read",
									})
								);
							}

							// Check for permission denied
							if (errorMessage.includes("EACCES") || errorMessage.includes("permission")) {
								return Effect.fail(
									new FileOperationError({
										path,
										operation: "read",
										cause: `Permission denied. Make sure you have read access to: ${path}`,
									})
								);
							}

							// Generic file operation error
							return Effect.fail(
								new FileOperationError({
									path,
									operation: "read",
									cause: error,
								})
							);
						})
					);
			});

		const writeFile = (
			path: string,
			content: string,
			context?: string
		): Effect.Effect<void, FileOperationError | DirectoryNotFoundError, EffectFileSystem.FileSystem> =>
			Effect.gen(function* () {
				const fs = yield* EffectFileSystem.FileSystem;
				yield* fs
					.writeFileString(path, content)
					.pipe(
						Effect.catchAll((error): Effect.Effect<void, FileOperationError | DirectoryNotFoundError, EffectFileSystem.FileSystem> => {
							const errorMessage = String(error);

							// Check for directory not found
							if (
								errorMessage.includes("ENOENT") &&
								path.includes("/")
							) {
								return Effect.fail(
									new DirectoryNotFoundError({
										path: path.substring(0, path.lastIndexOf("/")),
										operation: context || "write",
									})
								);
							}

							// Check for permission denied
							if (
								errorMessage.includes("EACCES") ||
								errorMessage.includes("permission")
							) {
								return Effect.fail(
									new FileOperationError({
										path,
										operation: "write",
										cause: `Permission denied. Make sure you have write access to: ${path}`,
									})
								);
							}

							// Check for disk space
							if (
								errorMessage.includes("ENOSPC") ||
								errorMessage.includes("No space")
							) {
								return Effect.fail(
									new FileOperationError({
										path,
										operation: "write",
										cause: "Disk space full. Cannot write to: " + path,
									})
								);
							}

							// Generic write error
							return Effect.fail(
								new FileOperationError({
									path,
									operation: "write",
									cause: error,
								})
							);
						})
					);
			});

		const ensureDirectory = (
			path: string
		): Effect.Effect<void, DirectoryNotFoundError | FileOperationError, EffectFileSystem.FileSystem> =>
			Effect.gen(function* () {
				const fs = yield* EffectFileSystem.FileSystem;
				yield* fs
					.makeDirectory(path, { recursive: true })
					.pipe(
						Effect.catchAll((error): Effect.Effect<void, DirectoryNotFoundError | FileOperationError, EffectFileSystem.FileSystem> => {
							const errorMessage = String(error);

							// Check for permission denied
							if (
								errorMessage.includes("EACCES") ||
								errorMessage.includes("permission")
							) {
								return Effect.fail(
									new FileOperationError({
										path,
										operation: "write",
										cause: `Permission denied. Cannot create directory: ${path}`,
									})
								);
							}

							// Check for disk space
							if (
								errorMessage.includes("ENOSPC") ||
								errorMessage.includes("No space")
							) {
								return Effect.fail(
									new FileOperationError({
										path,
										operation: "write",
										cause: "Disk space full. Cannot create directory: " + path,
									})
								);
							}

							// Generic directory creation error
							return Effect.fail(
								new FileOperationError({
									path,
									operation: "write",
									cause: error,
								})
							);
						})
					);
			});

		const fileExists = (
			path: string
		): Effect.Effect<boolean, FileOperationError, EffectFileSystem.FileSystem> =>
			Effect.gen(function* () {
				const fs = yield* EffectFileSystem.FileSystem;
				return yield* fs
					.exists(path)
					.pipe(
						Effect.catchAll((error): Effect.Effect<boolean, FileOperationError, EffectFileSystem.FileSystem> => {
							// If we can't check existence, it likely doesn't exist
							// But we should still report the error
							return Effect.fail(
								new FileOperationError({
									path,
									operation: "read",
									cause: `Cannot check if file exists: ${error}`,
								})
							);
						})
					);
			});

		return {
			readFile,
			writeFile,
			ensureDirectory,
			fileExists,
		};
	});

/**
 * EnhancedFileSystem as an Effect service
 */
export const EnhancedFileSystem = Effect.Service<EnhancedFileSystem>()(
	"EnhancedFileSystem",
	{
		accessors: true,
		effect: createEnhancedFileSystem(),
	}
);
