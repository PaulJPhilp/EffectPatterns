/**
 * Pre-validation service for command arguments
 *
 * Provides validators for common argument types:
 * - File path validation (existence, permissions)
 * - Directory validation
 * - Numeric range validation
 * - Enum value validation
 * - Required field validation
 *
 * Validators run BEFORE command execution to catch errors early.
 */

import { FileSystem as EffectFileSystem } from "@effect/platform";
import { Effect } from "effect";
import {
	ArgumentValidationError,
	FileNotFoundError,
	FileOperationError,
	OptionValidationError,
} from "../../errors.js";

/**
 * Validation result - accumulates all errors during validation
 */
export interface ValidationResult {
	readonly isValid: boolean;
	readonly errors: Array<
		| ArgumentValidationError
		| OptionValidationError
		| FileNotFoundError
		| FileOperationError
	>;
}

/**
 * Validation service interface
 */
export interface ValidationService {
	/**
	 * Validate that a file exists and is readable
	 */
	readonly validateFileExists: (
		path: string,
		argName: string
	) => Effect.Effect<void, ArgumentValidationError | FileOperationError, EffectFileSystem.FileSystem>;

	/**
	 * Validate that a directory exists
	 */
	readonly validateDirectoryExists: (
		path: string,
		argName: string
	) => Effect.Effect<void, ArgumentValidationError | FileOperationError, EffectFileSystem.FileSystem>;

	/**
	 * Validate that a numeric value is within a range
	 */
	readonly validateNumberRange: (
		value: number,
		min: number,
		max: number,
		argName: string
	) => Effect.Effect<void, OptionValidationError>;

	/**
	 * Validate that a value is one of allowed enum values
	 */
	readonly validateEnum: (
		value: string,
		allowedValues: readonly string[],
		argName: string,
		isOption?: boolean
	) => Effect.Effect<void, ArgumentValidationError | OptionValidationError>;

	/**
	 * Validate that a required field is provided
	 */
	readonly validateRequired: (
		value: unknown,
		fieldName: string,
		isOption?: boolean
	) => Effect.Effect<void, ArgumentValidationError | OptionValidationError>;

	/**
	 * Validate a file path format (basic checks)
	 */
	readonly validateFilePath: (
		path: string,
		argName: string,
		allowRelative?: boolean
	) => Effect.Effect<void, ArgumentValidationError>;
}

/**
 * Create validation service
 */
export const createValidationService = (): Effect.Effect<ValidationService, never, EffectFileSystem.FileSystem> =>
	Effect.gen(function* () {
		const validateFileExists = (
			path: string,
			argName: string
		): Effect.Effect<void, ArgumentValidationError | FileOperationError, EffectFileSystem.FileSystem> =>
			Effect.gen(function* () {
				const fs = yield* EffectFileSystem.FileSystem;
				const exists = yield* fs
					.exists(path)
					.pipe(
						Effect.catchAll((error) =>
							Effect.fail(
								new FileOperationError({
									path,
									operation: "read",
									cause: `Cannot check if file exists: ${error}`,
								})
							)
						)
					);

				if (!exists) {
					return yield* Effect.fail(
						new ArgumentValidationError({
							argument: argName,
							message: `file does not exist`,
							value: path,
							expected: `valid path to existing file`,
						})
					);
				}
			});

		const validateDirectoryExists = (
			path: string,
			argName: string
		): Effect.Effect<void, ArgumentValidationError | FileOperationError, EffectFileSystem.FileSystem> =>
			Effect.gen(function* () {
				const fs = yield* EffectFileSystem.FileSystem;
				const exists = yield* fs
					.exists(path)
					.pipe(
						Effect.catchAll((error) =>
							Effect.fail(
								new FileOperationError({
									path,
									operation: "read",
									cause: `Cannot check if directory exists: ${error}`,
								})
							)
						)
					);

				if (!exists) {
					return yield* Effect.fail(
						new ArgumentValidationError({
							argument: argName,
							message: `directory does not exist`,
							value: path,
							expected: `valid path to existing directory`,
						})
					);
				}
			});

		const validateNumberRange = (
			value: number,
			min: number,
			max: number,
			argName: string
		): Effect.Effect<void, OptionValidationError> => {
			if (value < min || value > max) {
				return Effect.fail(
					new OptionValidationError({
						option: argName,
						message: `out of range`,
						value,
						expected: `number between ${min} and ${max}`,
					})
				);
			}
			return Effect.void;
		};

		const validateEnum = (
			value: string,
			allowedValues: readonly string[],
			argName: string,
			isOption = false
		): Effect.Effect<void, ArgumentValidationError | OptionValidationError> => {
			if (!allowedValues.includes(value)) {
				const ErrorClass = isOption ? OptionValidationError : ArgumentValidationError;
				return Effect.fail(
					new ErrorClass({
						[isOption ? "option" : "argument"]: argName,
						message: `not a valid choice`,
						value,
						expected: `one of: ${allowedValues.join(", ")}`,
					} as any)
				);
			}
			return Effect.void;
		};

		const validateRequired = (
			value: unknown,
			fieldName: string,
			isOption = false
		): Effect.Effect<void, ArgumentValidationError | OptionValidationError> => {
			if (value === undefined || value === null || value === "") {
				const ErrorClass = isOption ? OptionValidationError : ArgumentValidationError;
				return Effect.fail(
					new ErrorClass({
						[isOption ? "option" : "argument"]: fieldName,
						message: `is required`,
						expected: `a non-empty value`,
					} as any)
				);
			}
			return Effect.void;
		};

		const validateFilePath = (
			path: string,
			argName: string,
			allowRelative = true
		): Effect.Effect<void, ArgumentValidationError> => {
			// Basic checks
			if (!path || path.trim() === "") {
				return Effect.fail(
					new ArgumentValidationError({
						argument: argName,
						message: `cannot be empty`,
						expected: `a valid file path`,
					})
				);
			}

			// Check for invalid characters
			if (path.includes("\0")) {
				return Effect.fail(
					new ArgumentValidationError({
						argument: argName,
						message: `contains null bytes`,
						value: path,
						expected: `path without null bytes`,
					})
				);
			}

			// Check for suspicious patterns
			if (path.includes("../")) {
				return Effect.fail(
					new ArgumentValidationError({
						argument: argName,
						message: `contains path traversal (../)`,
						value: path,
						expected: `path without traversal sequences`,
					})
				);
			}

			// Optional: check for absolute paths only
			if (!allowRelative && !path.startsWith("/")) {
				return Effect.fail(
					new ArgumentValidationError({
						argument: argName,
						message: `must be an absolute path`,
						value: path,
						expected: `path starting with /`,
					})
				);
			}

			return Effect.void;
		};

		return {
			validateFileExists,
			validateDirectoryExists,
			validateNumberRange,
			validateEnum,
			validateRequired,
			validateFilePath,
		};
	});

/**
 * ValidationService as an Effect service
 */
export const ValidationService = Effect.Service<ValidationService>()(
	"ValidationService",
	{
		accessors: true,
		effect: createValidationService(),
	}
);

/**
 * Helper to run all validations and collect errors
 */
export const runValidations = (
	validations: readonly Effect.Effect<void, any, any>[]
): Effect.Effect<ValidationResult, never, EffectFileSystem.FileSystem> =>
	Effect.gen(function* () {
		const errors: Array<any> = [];

		for (const validation of validations) {
			yield* validation.pipe(
				Effect.catchAll((error) => {
					errors.push(error);
					return Effect.void;
				})
			);
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	});
