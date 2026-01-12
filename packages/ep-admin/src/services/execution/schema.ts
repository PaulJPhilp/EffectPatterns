/**
 * Execution Service Schemas
 *
 * @effect/schema definitions for execution service types
 */

import { Schema } from "@effect/schema";

/**
 * Schema for execution options
 */
export const ExecutionOptionsSchema = Schema.Struct({
	verbose: Schema.optional(Schema.Boolean),
	timeout: Schema.optional(Schema.Number),
});

export type ExecutionOptions = Schema.Schema.Type<
	typeof ExecutionOptionsSchema
>;

/**
 * Schema for execution result
 */
export const ExecutionResultSchema = Schema.Struct({
	exitCode: Schema.Number,
	stdout: Schema.String,
	stderr: Schema.String,
	duration: Schema.optional(Schema.Number),
});

export type ExecutionResult = Schema.Schema.Type<typeof ExecutionResultSchema>;
