/**
 * Git service barrel exports
 */

// Service
export { Git } from "./service.js";

// Types
export type { GitCommit, GitRepository, GitStatus, GitTag } from "./types.js";

// API
export type { GitService } from "./api.js";

// Errors
export { GitCommandError, GitOperationError, GitRepositoryError } from "./errors.js";

// Helpers
export {
    categorizeCommits, execGitCommand,
    execGitCommandVoid, generateChangelog, getCommitsSinceTag, getGitRoot, getLatestTag, getRecommendedBump, isGitRepository,
    parseGitStatus
} from "./helpers.js";

