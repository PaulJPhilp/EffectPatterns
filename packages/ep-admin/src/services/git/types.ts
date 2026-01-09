/**
 * Git service types
 */

/**
 * Git repository status information
 */
export interface GitStatus {
	readonly branch: string;
	readonly clean: boolean;
	readonly staged: number;
	readonly unstaged: number;
	readonly untracked: number;
}

/**
 * Git tag information
 */
export interface GitTag {
	readonly name: string;
	readonly commit: string;
	readonly date?: string;
	readonly message?: string;
}

/**
 * Git commit information
 */
export interface GitCommit {
	readonly hash: string;
	readonly message: string;
	readonly author: string;
	readonly date: string;
}

/**
 * Git repository information
 */
export interface GitRepository {
	readonly root: string;
	readonly branch: string;
	readonly remote?: string;
	readonly commit: string;
	readonly status: GitStatus;
}
