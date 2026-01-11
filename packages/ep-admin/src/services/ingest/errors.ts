/**
 * Ingest Service Errors
 */

import { Data } from "effect";

/**
 * Pattern discovery error
 */
export class PatternDiscoveryError extends Data.TaggedError(
	"PatternDiscoveryError"
)<{
	readonly directory: string;
	readonly cause: string;
}> { }

/**
 * Pattern validation error
 */
export class PatternValidationError extends Data.TaggedError(
	"PatternValidationError"
)<{
	readonly patternId: string;
	readonly field?: string;
	readonly cause: string;
}> { }

/**
 * Pattern testing error
 */
export class PatternTestError extends Data.TaggedError("PatternTestError")<{
	readonly patternId: string;
	readonly cause: string;
	readonly testOutput?: string;
}> { }

/**
 * Pattern migration error
 */
export class PatternMigrationError extends Data.TaggedError(
	"PatternMigrationError"
)<{
	readonly patternId: string;
	readonly sourcePath: string;
	readonly targetPath: string;
	readonly cause: string;
}> { }

/**
 * Duplicate pattern error
 */
export class DuplicatePatternError extends Data.TaggedError(
	"DuplicatePatternError"
)<{
	readonly patternId: string;
	readonly existingPatternId: string;
}> { }

/**
 * File processing error
 */
export class FileProcessingError extends Data.TaggedError(
	"FileProcessingError"
)<{
	readonly file: string;
	readonly cause: string;
}> { }

/**
 * Frontmatter parsing error
 */
export class FrontmatterParseError extends Data.TaggedError(
	"FrontmatterParseError"
)<{
	readonly file: string;
	readonly cause: string;
}> { }

/**
 * TypeScript extraction error
 */
export class TypeScriptExtractionError extends Data.TaggedError(
	"TypeScriptExtractionError"
)<{
	readonly file: string;
	readonly cause: string;
}> { }
