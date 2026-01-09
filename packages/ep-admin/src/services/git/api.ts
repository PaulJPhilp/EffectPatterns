/**
 * Git service API
 */

import { Effect } from "effect";
import type { GitCommandError, GitRepositoryError } from "./errors.js";
import type { GitCommit, GitRepository, GitStatus, GitTag } from "./types.js";

/**
 * Git service interface
 */
export interface GitService {
	// Repository information
	readonly getRepository: () => Effect.Effect<GitRepository, GitRepositoryError | GitCommandError>;
	readonly getStatus: () => Effect.Effect<GitStatus, GitCommandError>;
	readonly getCurrentBranch: () => Effect.Effect<string, GitCommandError>;
	readonly getCurrentCommit: () => Effect.Effect<string, GitCommandError>;

	// Tag operations
	readonly getLatestTag: () => Effect.Effect<string, GitRepositoryError | GitCommandError>;
	readonly getAllTags: () => Effect.Effect<GitTag[], GitCommandError>;
	readonly createTag: (name: string, message?: string) => Effect.Effect<void, GitCommandError>;
	readonly pushTag: (name: string) => Effect.Effect<void, GitCommandError>;

	// Commit operations
	readonly getCommitHistory: (limit?: number) => Effect.Effect<GitCommit[], GitCommandError>;
	readonly add: (files: string[]) => Effect.Effect<void, GitCommandError>;
	readonly commit: (message: string) => Effect.Effect<void, GitCommandError>;
	readonly push: (remote?: string, branch?: string) => Effect.Effect<void, GitCommandError>;

	// Branch operations
	readonly createBranch: (name: string) => Effect.Effect<void, GitCommandError>;
	readonly checkoutBranch: (name: string) => Effect.Effect<void, GitCommandError>;
	readonly deleteBranch: (name: string) => Effect.Effect<void, GitCommandError>;

	// General git command execution
	readonly exec: (command: string, args: string[]) => Effect.Effect<string, GitCommandError>;
	readonly execVoid: (command: string, args: string[]) => Effect.Effect<void, GitCommandError>;
}
