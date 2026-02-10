/**
 * QA Service Errors
 */

import { Data } from "effect";

/**
 * QA configuration error
 */
export class QAConfigurationError extends Data.TaggedError(
	"QAConfigurationError"
)<{
	readonly configField: string;
	readonly cause: string;
}> { }

/**
 * QA results loading error
 */
export class QAResultsLoadError extends Data.TaggedError(
	"QAResultsLoadError"
)<{
	readonly resultsDir: string;
	readonly cause: string;
}> { }

/**
 * QA report generation error
 */
export class QAReportGenerationError extends Data.TaggedError(
	"QAReportGenerationError"
)<{
	readonly cause: string;
}> { }

/**
 * Pattern repair error
 */
export class PatternRepairError extends Data.TaggedError(
	"PatternRepairError"
)<{
	readonly patternId: string;
	readonly cause: string;
}> { }

/**
 * Backup creation error
 */
export class BackupCreationError extends Data.TaggedError(
	"BackupCreationError"
)<{
	readonly patternId: string;
	readonly backupPath: string;
	readonly cause: string;
}> { }

/**
 * QA file parsing error
 */
export class QAFileParseError extends Data.TaggedError(
	"QAFileParseError"
)<{
	readonly fileName: string;
	readonly cause: string;
}> { }

/**
 * Pattern not found error
 */
export class PatternNotFoundError extends Data.TaggedError(
	"PatternNotFoundError"
)<{
	readonly patternId: string;
	readonly patternsDir: string;
}> { }

/**
 * QA validation error (frontmatter/structure issues)
 */
export class QAValidationError extends Data.TaggedError(
	"QAValidationError"
)<{
	readonly filePath: string;
	readonly cause: string;
}> { }

/**
 * TypeScript type-check error
 */
export class TypeCheckError extends Data.TaggedError(
	"TypeCheckError"
)<{
	readonly filePath: string;
	readonly cause: string;
}> { }
