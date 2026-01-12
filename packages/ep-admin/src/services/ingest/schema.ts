/**
 * Ingest Service Schemas
 *
 * @effect/schema definitions for ingest service types
 */

import { Schema } from "@effect/schema";

/**
 * Schema for ingest configuration
 */
export const IngestConfigSchema = Schema.Struct({
	rawDir: Schema.String,
	srcDir: Schema.String,
	processedDir: Schema.String,
	publishedDir: Schema.String,
	targetPublishedDir: Schema.String,
	reportDir: Schema.String,
});

export type IngestConfig = Schema.Schema.Type<typeof IngestConfigSchema>;

/**
 * Schema for pattern information
 */
export const PatternSchema = Schema.Struct({
	id: Schema.String,
	title: Schema.String,
	rawPath: Schema.String,
	srcPath: Schema.String,
	processedPath: Schema.String,
	frontmatter: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
	hasTypeScript: Schema.Boolean,
});

export type Pattern = Schema.Schema.Type<typeof PatternSchema>;

/**
 * Issue type literal
 */
export const IssueTypeSchema = Schema.Literal("error", "warning");

/**
 * Schema for ingest issue
 */
export const IngestIssueSchema = Schema.Struct({
	type: IssueTypeSchema,
	category: Schema.String,
	message: Schema.String,
});

export type IngestIssue = Schema.Schema.Type<typeof IngestIssueSchema>;

/**
 * Schema for ingest result
 */
export const IngestResultSchema = Schema.Struct({
	pattern: PatternSchema,
	valid: Schema.Boolean,
	issues: Schema.Array(IngestIssueSchema),
	qaScore: Schema.optional(Schema.Number),
	qaPassed: Schema.optional(Schema.Boolean),
	qaIssues: Schema.optional(Schema.Array(Schema.String)),
	testPassed: Schema.optional(Schema.Boolean),
	isDuplicate: Schema.optional(Schema.Boolean),
	existingPatternId: Schema.optional(Schema.String),
});

export type IngestResult = Schema.Schema.Type<typeof IngestResultSchema>;

/**
 * Schema for ingest report
 */
export const IngestReportSchema = Schema.Struct({
	timestamp: Schema.String,
	totalPatterns: Schema.Number,
	validated: Schema.Number,
	testsPassed: Schema.Number,
	duplicates: Schema.Number,
	migrated: Schema.Number,
	failed: Schema.Number,
	results: Schema.Array(IngestResultSchema),
});

export type IngestReport = Schema.Schema.Type<typeof IngestReportSchema>;

/**
 * Schema for process result
 */
export const ProcessResultSchema = Schema.Struct({
	file: Schema.String,
	success: Schema.Boolean,
	id: Schema.optional(Schema.String),
	error: Schema.optional(Schema.String),
});

export type ProcessResult = Schema.Schema.Type<typeof ProcessResultSchema>;

/**
 * Schema for failed file entry
 */
export const FailedFileSchema = Schema.Struct({
	file: Schema.String,
	error: Schema.String,
});

/**
 * Schema for process summary
 */
export const ProcessSummarySchema = Schema.Struct({
	total: Schema.Number,
	processed: Schema.Number,
	failed: Schema.Number,
	processedFiles: Schema.Array(Schema.String),
	failedFiles: Schema.Array(FailedFileSchema),
});

export type ProcessSummary = Schema.Schema.Type<typeof ProcessSummarySchema>;
