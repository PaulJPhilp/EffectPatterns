/**
 * Database Service Schemas
 *
 * @effect/schema definitions for database service types
 */

import { Schema } from "@effect/schema";

/**
 * Schema for individual test result
 */
export const DBTestResultSchema = Schema.Struct({
	name: Schema.String,
	passed: Schema.Boolean,
	error: Schema.optional(Schema.String),
	duration: Schema.Number,
});

export type DBTestResult = Schema.Schema.Type<typeof DBTestResultSchema>;

/**
 * Schema for test summary
 */
export const DBTestSummarySchema = Schema.Struct({
	total: Schema.Number,
	passed: Schema.Number,
	failed: Schema.Number,
	totalDuration: Schema.Number,
	results: Schema.Array(DBTestResultSchema),
});

export type DBTestSummary = Schema.Schema.Type<typeof DBTestSummarySchema>;

/**
 * Schema for database statistics
 */
export const DBStatsSchema = Schema.Struct({
	applicationPatterns: Schema.Number,
	effectPatterns: Schema.Number,
	jobs: Schema.Number,
	tables: Schema.Array(Schema.String),
});

export type DBStats = Schema.Schema.Type<typeof DBStatsSchema>;

/**
 * Schema for table status
 */
export const TableStatusSchema = Schema.Struct({
	name: Schema.String,
	exists: Schema.Boolean,
});

export type TableStatus = Schema.Schema.Type<typeof TableStatusSchema>;

/**
 * Schema for quick test result
 */
export const DBQuickTestResultSchema = Schema.Struct({
	connected: Schema.Boolean,
	tablesExist: Schema.Boolean,
	tables: Schema.Array(TableStatusSchema),
	stats: DBStatsSchema,
	searchWorks: Schema.Boolean,
	repositoriesWork: Schema.Boolean,
});

export type DBQuickTestResult = Schema.Schema.Type<
	typeof DBQuickTestResultSchema
>;
