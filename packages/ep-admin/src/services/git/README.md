# Git Service

Effect-based git operations service for the ep-admin CLI with type-safe git command execution and repository management.

## Features

- **Repository information**: Get repository root, branch, commit, status, and remote information
- **Tag operations**: List, create, and push git tags
- **Commit operations**: View commit history, add files, commit, and push changes
- **Branch operations**: Create, checkout, and delete branches
- **Command execution**: Execute arbitrary git commands with type-safe error handling
- **Modern Effect.Service pattern**: Type-safe and composable

## Usage

```typescript
import { Git } from "./services/git.js";

// Get repository information
const repo = yield* Git.getRepository();
yield* Git.info(`Repository: ${repo.root}, Branch: ${repo.branch}`);

// Get status
const status = yield* Git.getStatus();
if (!status.clean) {
  yield* Git.warn(`Uncommitted changes: ${status.staged} staged, ${status.unstaged} unstaged`);
}

// Tag operations
const latestTag = yield* Git.getLatestTag();
yield* Git.createTag("v1.0.0", "Release version 1.0.0");
yield* Git.pushTag("v1.0.0");

// Commit operations
yield* Git.add(["file1.ts", "file2.ts"]);
yield* Git.commit("feat: add new feature");
yield* Git.push();

// Branch operations
yield* Git.createBranch("feature/new-feature");
yield* Git.checkoutBranch("feature/new-feature");

// Execute custom git commands
const output = yield* Git.exec("log", ["--oneline", "-5"]);
```

## API

### Repository Information

- `getRepository()`: Get complete repository information (root, branch, commit, status, remote)
- `getStatus()`: Get repository status (branch, clean state, staged/unstaged/untracked counts)
- `getCurrentBranch()`: Get current branch name
- `getCurrentCommit()`: Get current commit hash

### Tag Operations

- `getLatestTag()`: Get the latest git tag
- `getAllTags()`: Get all tags with details (name, commit, date, message)
- `createTag(name, message?)`: Create an annotated tag
- `pushTag(name)`: Push a tag to remote

### Commit Operations

- `getCommitHistory(limit?)`: Get commit history (default: 10 commits)
- `add(files)`: Stage files for commit
- `commit(message)`: Create a commit with message
- `push(remote?, branch?)`: Push changes to remote (default: origin, HEAD)

### Branch Operations

- `createBranch(name)`: Create a new branch
- `checkoutBranch(name)`: Checkout a branch
- `deleteBranch(name)`: Delete a branch

### Command Execution

- `exec(command, args)`: Execute git command and return output
- `execVoid(command, args)`: Execute git command without capturing output

## Error Handling

The service uses Effect tagged errors:

- `GitCommandError`: Thrown when git command execution fails
- `GitRepositoryError`: Thrown when repository is not found or invalid
- `GitOperationError`: Thrown when git operation is not allowed

## Layers

- `Git.Default`: Default git layer
- `GitLive`: Git layer that validates we're in a git repository

## Dependencies

- Effect: Core functional programming library
- Node.js child_process: For executing git commands

## Testing

See `__tests__/` directory for unit tests covering:
- Repository information retrieval
- Tag operations
- Commit and branch operations
- Error handling
