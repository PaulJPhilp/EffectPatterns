/**
 * QA Service Schemas
 *
 * @effect/schema definitions for QA service types
 */

import { Schema } from "@effect/schema";

/**
 * Schema for QA configuration
 */
export const QAConfigSchema = Schema.Struct({
	qaDir: Schema.String,
	resultsDir: Schema.String,
	backupsDir: Schema.String,
	repairsDir: Schema.String,
	patternsDir: Schema.String,
	reportFile: Schema.String,
});

export type QAConfig = Schema.Schema.Type<typeof QAConfigSchema>;

/**
 * Schema for QA result metadata
 */
export const QAResultMetadataSchema = Schema.Struct({
	title: Schema.optional(Schema.String),
	skillLevel: Schema.optional(Schema.String),
	tags: Schema.optional(Schema.Array(Schema.String)),
});

/**
 * Schema for individual QA result
 */
export const QAResultSchema = Schema.Struct({
	passed: Schema.Boolean,
	patternId: Schema.optional(Schema.String),
	fileName: Schema.optional(Schema.String),
	tokens: Schema.optional(Schema.Number),
	cost: Schema.optional(Schema.Number),
	duration: Schema.optional(Schema.Number),
	metadata: Schema.optional(QAResultMetadataSchema),
	errors: Schema.optional(Schema.Array(Schema.String)),
	warnings: Schema.optional(Schema.Array(Schema.String)),
	suggestions: Schema.optional(Schema.Array(Schema.String)),
	qaFile: Schema.optional(Schema.String),
});

export type QAResult = Schema.Schema.Type<typeof QAResultSchema>;

/**
 * Schema for QA report summary
 */
export const QAReportSummarySchema = Schema.Struct({
	totalPatterns: Schema.Number,
	passed: Schema.Number,
	failed: Schema.Number,
	passRate: Schema.Number,
	totalTokens: Schema.Number,
	totalCost: Schema.Number,
	averageDuration: Schema.Number,
	generatedAt: Schema.String,
});

export type QAReportSummary = Schema.Schema.Type<typeof QAReportSummarySchema>;

/**
 * Schema for skill level stats
 */
export const SkillLevelStatsSchema = Schema.Struct({
	passed: Schema.Number,
	failed: Schema.Number,
});

/**
 * Schema for failed pattern details
 */
export const FailedPatternSchema = Schema.Struct({
	patternId: Schema.String,
	fileName: Schema.String,
	title: Schema.String,
	skillLevel: Schema.String,
	tags: Schema.Array(Schema.String),
	errors: Schema.Array(Schema.String),
	warnings: Schema.Array(Schema.String),
	suggestions: Schema.Array(Schema.String),
});

/**
 * Schema for token usage metrics
 */
export const TokenUsageSchema = Schema.Struct({
	min: Schema.Number,
	max: Schema.Number,
	average: Schema.Number,
});

/**
 * Schema for cost analysis metrics
 */
export const CostAnalysisSchema = Schema.Struct({
	min: Schema.Number,
	max: Schema.Number,
	average: Schema.Number,
	total: Schema.Number,
});

/**
 * Schema for duration stats
 */
export const DurationStatsSchema = Schema.Struct({
	min: Schema.Number,
	max: Schema.Number,
	average: Schema.Number,
});

/**
 * Schema for QA status
 */
export const QAStatusSchema = Schema.Struct({
	total: Schema.Number,
	passed: Schema.Number,
	failed: Schema.Number,
	passRate: Schema.Number,
	failuresByCategory: Schema.Record({
		key: Schema.String,
		value: Schema.Number,
	}),
	bySkillLevel: Schema.Record({
		key: Schema.String,
		value: SkillLevelStatsSchema,
	}),
});

export type QAStatus = Schema.Schema.Type<typeof QAStatusSchema>;

/**
 * Schema for repair result
 */
export const RepairResultSchema = Schema.Struct({
	patternId: Schema.String,
	success: Schema.Boolean,
	changesApplied: Schema.optional(Schema.Number),
	error: Schema.optional(Schema.String),
});

export type RepairResult = Schema.Schema.Type<typeof RepairResultSchema>;

/**
 * Schema for repair summary
 */
export const RepairSummarySchema = Schema.Struct({
	attempted: Schema.Number,
	repaired: Schema.Number,
	failed: Schema.Number,
	results: Schema.Array(RepairResultSchema),
});

export type RepairSummary = Schema.Schema.Type<typeof RepairSummarySchema>;
