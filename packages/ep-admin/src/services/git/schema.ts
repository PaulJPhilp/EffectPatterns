/**
 * Git Service Schemas
 *
 * @effect/schema definitions for git service types
 */

import { Schema } from "@effect/schema";

/**
 * Schema for git repository status
 */
export const GitStatusSchema = Schema.Struct({
	branch: Schema.String,
	clean: Schema.Boolean,
	staged: Schema.Number,
	unstaged: Schema.Number,
	untracked: Schema.Number,
});

export type GitStatus = Schema.Schema.Type<typeof GitStatusSchema>;

/**
 * Schema for git tag information
 */
export const GitTagSchema = Schema.Struct({
	name: Schema.String,
	commit: Schema.String,
	date: Schema.optional(Schema.String),
	message: Schema.optional(Schema.String),
});

export type GitTag = Schema.Schema.Type<typeof GitTagSchema>;

/**
 * Schema for git commit information
 */
export const GitCommitSchema = Schema.Struct({
	hash: Schema.String,
	message: Schema.String,
	author: Schema.String,
	date: Schema.String,
});

export type GitCommit = Schema.Schema.Type<typeof GitCommitSchema>;

/**
 * Schema for git repository information
 */
export const GitRepositorySchema = Schema.Struct({
	root: Schema.String,
	branch: Schema.String,
	remote: Schema.optional(Schema.String),
	commit: Schema.String,
	status: GitStatusSchema,
});

export type GitRepository = Schema.Schema.Type<typeof GitRepositorySchema>;
