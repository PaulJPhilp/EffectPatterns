/**
 * TUI Service Schemas
 *
 * @effect/schema definitions for TUI service types
 */

import { Schema } from "@effect/schema";

/**
 * Schema for terminal context
 */
export const TerminalSchema = Schema.Struct({
	width: Schema.optional(Schema.Number),
	height: Schema.optional(Schema.Number),
	colors: Schema.optional(Schema.Boolean),
	type: Schema.optional(Schema.String),
});

export type Terminal = Schema.Schema.Type<typeof TerminalSchema>;

/**
 * Alignment type literal
 */
export const AlignmentSchema = Schema.Literal("left", "center", "right");

export type Alignment = Schema.Schema.Type<typeof AlignmentSchema>;

/**
 * Schema for table column definition
 */
export const TableColumnSchema = Schema.Struct({
	key: Schema.String,
	header: Schema.String,
	width: Schema.optional(Schema.Number),
	align: Schema.optional(AlignmentSchema),
});

export type TableColumn = Schema.Schema.Type<typeof TableColumnSchema>;

/**
 * Schema for table display options
 */
export const TableOptionsSchema = Schema.Struct({
	columns: Schema.Array(TableColumnSchema),
	bordered: Schema.optional(Schema.Boolean),
	maxWidth: Schema.optional(Schema.Number),
});

export type TableOptions = Schema.Schema.Type<typeof TableOptionsSchema>;

/**
 * Schema for panel display options
 */
export const PanelOptionsSchema = Schema.Struct({
	border: Schema.optional(Schema.Boolean),
	padding: Schema.optional(Schema.Number),
	width: Schema.optional(Schema.Number),
	align: Schema.optional(AlignmentSchema),
});

export type PanelOptions = Schema.Schema.Type<typeof PanelOptionsSchema>;

/**
 * Schema for table row data (flexible record)
 */
export const TableRowSchema = Schema.Record({
	key: Schema.String,
	value: Schema.Union(
		Schema.String,
		Schema.Number,
		Schema.Boolean,
		Schema.Null,
		Schema.Undefined
	),
});

export type TableRow = Schema.Schema.Type<typeof TableRowSchema>;
