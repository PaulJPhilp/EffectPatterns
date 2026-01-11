/**
 * Publish Service Errors
 *
 * Error types for the complete publishing pipeline
 */

import { Data } from "effect";

// --- VALIDATION ERRORS ---

/**
 * Frontmatter validation error
 */
export class FrontmatterValidationError extends Data.TaggedError(
	"FrontmatterValidationError"
)<{
	readonly file: string;
	readonly field?: string;
	readonly cause: string;
}> { }

/**
 * Pattern structure validation error
 */
export class PatternStructureError extends Data.TaggedError(
	"PatternStructureError"
)<{
	readonly file: string;
	readonly section?: string;
	readonly cause: string;
}> { }

/**
 * Code validation error
 */
export class CodeValidationError extends Data.TaggedError(
	"CodeValidationError"
)<{
	readonly file: string;
	readonly codeBlock?: string;
	readonly cause: string;
}> { }

/**
 * Link validation error
 */
export class LinkValidationError extends Data.TaggedError(
	"LinkValidationError"
)<{
	readonly file: string;
	readonly link: string;
	readonly cause: string;
}> { }

// --- TESTING ERRORS ---

/**
 * TypeScript compilation error
 */
export class TypeScriptCompilationError extends Data.TaggedError(
	"TypeScriptCompilationError"
)<{
	readonly file: string;
	readonly compilationOutput: string;
	readonly cause: string;
}> { }

/**
 * Runtime test error
 */
export class RuntimeError extends Data.TaggedError("RuntimeError")<{
	readonly file: string;
	readonly cause: string;
	readonly stack?: string;
}> { }

/**
 * Test timeout error
 */
export class TestTimeoutError extends Data.TaggedError("TestTimeoutError")<{
	readonly file: string;
	readonly timeout: number;
	readonly cause: string;
}> { }

// --- PUBLISHING ERRORS ---

/**
 * File publishing error
 */
export class FilePublishError extends Data.TaggedError("FilePublishError")<{
	readonly file: string;
	readonly targetPath: string;
	readonly cause: string;
}> { }

/**
 * Backup creation error
 */
export class BackupError extends Data.TaggedError("BackupError")<{
	readonly file: string;
	readonly backupPath: string;
	readonly cause: string;
}> { }

/**
 * Pattern migration error
 */
export class PatternMigrationError extends Data.TaggedError(
	"PatternMigrationError"
)<{
	readonly file: string;
	readonly cause: string;
}> { }

// --- LINTING ERRORS ---

/**
 * Lint execution error
 */
export class LintExecutionError extends Data.TaggedError("LintExecutionError")<{
	readonly file: string;
	readonly linter: string;
	readonly cause: string;
}> { }

/**
 * Lint configuration error
 */
export class LintConfigError extends Data.TaggedError("LintConfigError")<{
	readonly configField: string;
	readonly cause: string;
}> { }

// --- GENERATION ERRORS ---

/**
 * README generation error
 */
export class ReadmeGenerationError extends Data.TaggedError(
	"ReadmeGenerationError"
)<{
	readonly outputFile: string;
	readonly cause: string;
}> { }

/**
 * Template error
 */
export class TemplateError extends Data.TaggedError("TemplateError")<{
	readonly templatePath: string;
	readonly cause: string;
}> { }

/**
 * Stats collection error
 */
export class StatsCollectionError extends Data.TaggedError(
	"StatsCollectionError"
)<{
	readonly directory: string;
	readonly cause: string;
}> { }

// --- PIPELINE ERRORS ---

/**
 * Pipeline configuration error
 */
export class PipelineConfigError extends Data.TaggedError(
	"PipelineConfigError"
)<{
	readonly step: string;
	readonly configField: string;
	readonly cause: string;
}> { }

/**
 * Pipeline execution error
 */
export class PipelineExecutionError extends Data.TaggedError(
	"PipelineExecutionError"
)<{
	readonly step: string;
	readonly cause: string;
	readonly previousErrors?: string[];
}> { }

/**
 * Step dependency error
 */
export class StepDependencyError extends Data.TaggedError("StepDependencyError")<{
	readonly step: string;
	readonly dependency: string;
	readonly cause: string;
}> { }
