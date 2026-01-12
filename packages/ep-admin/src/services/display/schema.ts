/**
 * Display Service Schemas
 *
 * @effect/schema definitions for display service types
 */

import { Schema } from "@effect/schema";

/**
 * Panel type literal
 */
export const PanelTypeSchema = Schema.Literal(
	"info",
	"success",
	"error",
	"warning"
);

export type PanelType = Schema.Schema.Type<typeof PanelTypeSchema>;

/**
 * Schema for panel display options
 */
export const PanelOptionsSchema = Schema.Struct({
	type: Schema.optional(PanelTypeSchema),
});

export type PanelOptions = Schema.Schema.Type<typeof PanelOptionsSchema>;

/**
 * Alignment type literal
 */
export const AlignmentSchema = Schema.Literal("left", "center", "right");

export type Alignment = Schema.Schema.Type<typeof AlignmentSchema>;

/**
 * Schema for table column definition (non-generic version for validation)
 */
export const TableColumnBaseSchema = Schema.Struct({
	key: Schema.String,
	header: Schema.String,
	width: Schema.optional(Schema.Number),
	align: Schema.optional(AlignmentSchema),
});

export type TableColumnBase = Schema.Schema.Type<typeof TableColumnBaseSchema>;

/**
 * Schema for table head options
 */
export const TableHeadOptionsSchema = Schema.Struct({
	bold: Schema.optional(Schema.Boolean),
	color: Schema.optional(Schema.String),
});

export type TableHeadOptions = Schema.Schema.Type<
	typeof TableHeadOptionsSchema
>;

/**
 * Schema for table display options (non-generic version for validation)
 */
export const TableOptionsBaseSchema = Schema.Struct({
	columns: Schema.Array(TableColumnBaseSchema),
	bordered: Schema.optional(Schema.Boolean),
	head: Schema.optional(TableHeadOptionsSchema),
});

export type TableOptionsBase = Schema.Schema.Type<
	typeof TableOptionsBaseSchema
>;
