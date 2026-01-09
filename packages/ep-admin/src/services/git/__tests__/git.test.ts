/**
 * Git service tests
 */

import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GitCommandError } from "../errors.js";
import * as helpers from "../helpers.js";
import { Git } from "../service.js";

// Mock the helpers module
// Mock the helpers module
vi.mock("../helpers.js", async () => {
	const actual = await vi.importActual<typeof import("../helpers.js")>("../helpers.js");
	return {
		...actual,
		execGitCommand: vi.fn(),
		execGitCommandVoid: vi.fn(),
		getGitRoot: vi.fn(),
		isGitRepository: vi.fn(),
		parseGitStatus: actual.parseGitStatus,
	};
});

describe("Git Service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Repository Information", () => {
		it("should get repository information", async () => {
			(helpers.getGitRoot as any).mockReturnValue(
				Effect.succeed("/path/to/repo")
			);
			// getCurrentBranch -> getCurrentCommit -> getStatus (status + branch) -> remote
			(helpers.execGitCommand as any)
				.mockReturnValueOnce(Effect.succeed("main")) // getCurrentBranch
				.mockReturnValueOnce(Effect.succeed("abc123")) // getCurrentCommit
				.mockReturnValueOnce(Effect.succeed("## main\n")) // getStatus - status
				.mockReturnValueOnce(Effect.succeed("main")) // getStatus - branch
				.mockReturnValueOnce(Effect.succeed("https://github.com/user/repo.git")); // remote

			const program = Effect.gen(function* () {
				const git = yield* Git;
				return yield* git.getRepository();
			});

			const result = await  (Effect.runPromise as any)(
				program.pipe(Effect.provide(Layer.mergeAll(Git.Default, Execution.Default, Display.Default, Logger.Default)))
			);

			expect(result.root).toBe("/path/to/repo");
			expect(result.branch).toBe("main");
			expect(result.commit).toBe("abc123");
			expect(result.remote).toBe("https://github.com/user/repo.git");
		});

		it("should handle repository without remote", async () => {
			(helpers.getGitRoot as any).mockReturnValue(
				Effect.succeed("/path/to/repo")
			);
			// getCurrentBranch -> getCurrentCommit -> getStatus (status + branch) -> remote (fails)
			(helpers.execGitCommand as any)
				.mockReturnValueOnce(Effect.succeed("main")) // getCurrentBranch
				.mockReturnValueOnce(Effect.succeed("abc123")) // getCurrentCommit
				.mockReturnValueOnce(Effect.succeed("## main\n")) // getStatus - status
				.mockReturnValueOnce(Effect.succeed("main")) // getStatus - branch
				.mockReturnValueOnce(
					Effect.fail(GitCommandError.make("remote", ["get-url", "origin"], "No remote"))
				); // remote - fails

			const program = Effect.gen(function* () {
				const git = yield* Git;
				return yield* git.getRepository();
			});

			const result = await  (Effect.runPromise as any)(
				program.pipe(Effect.provide(Layer.mergeAll(Git.Default, Execution.Default, Display.Default, Logger.Default)))
			);

			expect(result.root).toBe("/path/to/repo");
			expect(result.branch).toBe("main");
			expect(result.remote).toBeUndefined();
		});

		it("should get status", async () => {
			(helpers.execGitCommand as any)
				.mockReturnValueOnce(Effect.succeed("## main\nM  file1.ts"))
				.mockReturnValueOnce(Effect.succeed("main"));

			const program = Effect.gen(function* () {
				const git = yield* Git;
				return yield* git.getStatus();
			});

			const result = await  (Effect.runPromise as any)(
				program.pipe(Effect.provide(Layer.mergeAll(Git.Default, Execution.Default, Display.Default, Logger.Default)))
			);

			expect(result.branch).toBe("main");
			expect(result.staged).toBe(1);
			expect(result.clean).toBe(false);
		});

		it("should detect clean status", async () => {
			(helpers.execGitCommand as any)
				.mockReturnValueOnce(Effect.succeed("## main\n"))
				.mockReturnValueOnce(Effect.succeed("main"));

			const program = Effect.gen(function* () {
				const git = yield* Git;
				return yield* git.getStatus();
			});

			const result = await  (Effect.runPromise as any)(
				program.pipe(Effect.provide(Layer.mergeAll(Git.Default, Execution.Default, Display.Default, Logger.Default)))
			);

			expect(result.clean).toBe(true);
		});

		it("should get current branch", async () => {
			(helpers.execGitCommand as any).mockReturnValue(
				Effect.succeed("feature-branch")
			);

			const program = Effect.gen(function* () {
				const git = yield* Git;
				return yield* git.getCurrentBranch();
			});

			const result = await  (Effect.runPromise as any)(
				program.pipe(Effect.provide(Layer.mergeAll(Git.Default, Execution.Default, Display.Default, Logger.Default)))
			);

			expect(result).toBe("feature-branch");
		});

		it("should get current commit", async () => {
			(helpers.execGitCommand as any).mockReturnValue(
				Effect.succeed("abc123def456")
			);

			const program = Effect.gen(function* () {
				const git = yield* Git;
				return yield* git.getCurrentCommit();
			});

			const result = await  (Effect.runPromise as any)(
				program.pipe(Effect.provide(Layer.mergeAll(Git.Default, Execution.Default, Display.Default, Logger.Default)))
			);

			expect(result).toBe("abc123def456");
		});
	});

	describe("Tag Operations", () => {
		it("should get latest tag", async () => {
			(helpers.execGitCommand as any).mockReturnValue(
				Effect.succeed("v1.0.0")
			);

			const program = Effect.gen(function* () {
				const git = yield* Git;
				return yield* git.getLatestTag();
			});

			const result = await  (Effect.runPromise as any)(
				program.pipe(Effect.provide(Layer.mergeAll(Git.Default, Execution.Default, Display.Default, Logger.Default)))
			);

			expect(result).toBe("v1.0.0");
		});

		it("should handle no tags found", async () => {
			const noTagsError = GitCommandError.make("describe", ["--tags", "--abbrev=0"], "fatal: No names found, cannot describe anything.");
			(helpers.execGitCommand as any).mockReturnValue(
				Effect.fail(noTagsError)
			);

			const program = Effect.gen(function* () {
				const git = yield* Git;
				return yield* git.getLatestTag();
			});

			await expect(
				 (Effect.runPromise as any)(program.pipe(Effect.provide(Layer.mergeAll(Git.Default, Execution.Default, Display.Default, Logger.Default))))
			).rejects.toThrow();
		});

		it("should get all tags", async () => {
			// tag list -> for each tag: commit, date, message
			// Note: getAllTags processes tags in order, so we need mocks for each tag's details
			// Testing with 2 tags: v1.0.0 and v0.9.0
			(helpers.execGitCommand as any)
				.mockReturnValueOnce(Effect.succeed("v1.0.0\nv0.9.0")) // tag list
				.mockReturnValueOnce(Effect.succeed("abc123")) // v1.0.0 commit (rev-list)
				.mockReturnValueOnce(Effect.succeed("2024-01-01 12:00:00 +0000")) // v1.0.0 date (log)
				.mockReturnValueOnce(Effect.succeed("Release v1.0.0")) // v1.0.0 message (tag -l)
				.mockReturnValueOnce(Effect.succeed("def456")) // v0.9.0 commit (rev-list)
				.mockReturnValueOnce(Effect.succeed("2024-01-02 12:00:00 +0000")) // v0.9.0 date (log)
				.mockReturnValueOnce(Effect.succeed("Release v0.9.0")); // v0.9.0 message (tag -l)

			const program = Effect.gen(function* () {
				const git = yield* Git;
				return yield* git.getAllTags();
			});

			const result = await  (Effect.runPromise as any)(
				program.pipe(Effect.provide(Layer.mergeAll(Git.Default, Execution.Default, Display.Default, Logger.Default)))
			);

			expect(result).toHaveLength(2);
			expect(result[0]?.name).toBe("v1.0.0");
			expect(result[0]?.commit).toBe("abc123");
			expect(result[1]?.name).toBe("v0.9.0");
			expect(result[1]?.commit).toBe("def456");
		});

		it("should handle empty tags", async () => {
			(helpers.execGitCommand as any).mockReturnValue(Effect.succeed(""));

			const program = Effect.gen(function* () {
				const git = yield* Git;
				return yield* git.getAllTags();
			});

			const result = await  (Effect.runPromise as any)(
				program.pipe(Effect.provide(Layer.mergeAll(Git.Default, Execution.Default, Display.Default, Logger.Default)))
			);

			expect(result).toHaveLength(0);
		});

		it("should create tag with message", async () => {
			(helpers.execGitCommandVoid as any).mockReturnValue(Effect.succeed(void 0));

			const program = Effect.gen(function* () {
				const git = yield* Git;
				return yield* git.createTag("v1.0.0", "Release version 1.0.0");
			});

			await  (Effect.runPromise as any)(program.pipe(Effect.provide(Layer.mergeAll(Git.Default, Execution.Default, Display.Default, Logger.Default))));

			expect(helpers.execGitCommandVoid).toHaveBeenCalledWith("tag", [
				"-a",
				"v1.0.0",
				"-m",
				"Release version 1.0.0",
			]);
		});

		it("should create tag without message", async () => {
			(helpers.execGitCommandVoid as any).mockReturnValue(Effect.succeed(void 0));

			const program = Effect.gen(function* () {
				const git = yield* Git;
				return yield* git.createTag("v1.0.0");
			});

			await  (Effect.runPromise as any)(program.pipe(Effect.provide(Layer.mergeAll(Git.Default, Execution.Default, Display.Default, Logger.Default))));

			expect(helpers.execGitCommandVoid).toHaveBeenCalledWith("tag", [
				"-a",
				"v1.0.0",
			]);
		});

		it("should push tag", async () => {
			(helpers.execGitCommandVoid as any).mockReturnValue(Effect.succeed(void 0));

			const program = Effect.gen(function* () {
				const git = yield* Git;
				return yield* git.pushTag("v1.0.0");
			});

			await  (Effect.runPromise as any)(program.pipe(Effect.provide(Layer.mergeAll(Git.Default, Execution.Default, Display.Default, Logger.Default))));

			expect(helpers.execGitCommandVoid).toHaveBeenCalledWith("push", [
				"origin",
				"v1.0.0",
			]);
		});
	});

	describe("Commit Operations", () => {
		it("should get commit history", async () => {
			(helpers.execGitCommand as any).mockReturnValue(
				Effect.succeed("abc123|Commit 1|Author|2024-01-01\ndef456|Commit 2|Author|2024-01-02")
			);

			const program = Effect.gen(function* () {
				const git = yield* Git;
				return yield* git.getCommitHistory(2);
			});

			const result = await  (Effect.runPromise as any)(
				program.pipe(Effect.provide(Layer.mergeAll(Git.Default, Execution.Default, Display.Default, Logger.Default)))
			);

			expect(result).toHaveLength(2);
			expect(result[0]?.hash).toBe("abc123");
			expect(result[0]?.message).toBe("Commit 1");
		});

		it("should use default limit", async () => {
			(helpers.execGitCommand as any).mockReturnValue(
				Effect.succeed("abc123|Commit|Author|2024-01-01")
			);

			const program = Effect.gen(function* () {
				const git = yield* Git;
				return yield* git.getCommitHistory();
			});

			const result = await  (Effect.runPromise as any)(
				program.pipe(Effect.provide(Layer.mergeAll(Git.Default, Execution.Default, Display.Default, Logger.Default)))
			);

			expect(helpers.execGitCommand).toHaveBeenCalledWith("log", [
				"-10",
				"--format=%H|%s|%an|%ci",
			]);
			expect(result).toHaveLength(1);
		});

		it("should add files", async () => {
			(helpers.execGitCommandVoid as any).mockReturnValue(Effect.succeed(void 0));

			const program = Effect.gen(function* () {
				const git = yield* Git;
				return yield* git.add(["file1.ts", "file2.ts"]);
			});

			await  (Effect.runPromise as any)(program.pipe(Effect.provide(Layer.mergeAll(Git.Default, Execution.Default, Display.Default, Logger.Default))));

			expect(helpers.execGitCommandVoid).toHaveBeenCalledWith("add", [
				"file1.ts",
				"file2.ts",
			]);
		});

		it("should commit", async () => {
			(helpers.execGitCommandVoid as any).mockReturnValue(Effect.succeed(void 0));

			const program = Effect.gen(function* () {
				const git = yield* Git;
				return yield* git.commit("feat: add new feature");
			});

			await  (Effect.runPromise as any)(program.pipe(Effect.provide(Layer.mergeAll(Git.Default, Execution.Default, Display.Default, Logger.Default))));

			expect(helpers.execGitCommandVoid).toHaveBeenCalledWith("commit", [
				"-m",
				"feat: add new feature",
			]);
		});

		it("should push with defaults", async () => {
			(helpers.execGitCommandVoid as any).mockReturnValue(Effect.succeed(void 0));

			const program = Effect.gen(function* () {
				const git = yield* Git;
				return yield* git.push();
			});

			await  (Effect.runPromise as any)(program.pipe(Effect.provide(Layer.mergeAll(Git.Default, Execution.Default, Display.Default, Logger.Default))));

			expect(helpers.execGitCommandVoid).toHaveBeenCalledWith("push", [
				"origin",
				"HEAD",
			]);
		});

		it("should push with custom remote and branch", async () => {
			(helpers.execGitCommandVoid as any).mockReturnValue(Effect.succeed(void 0));

			const program = Effect.gen(function* () {
				const git = yield* Git;
				return yield* git.push("upstream", "main");
			});

			await  (Effect.runPromise as any)(program.pipe(Effect.provide(Layer.mergeAll(Git.Default, Execution.Default, Display.Default, Logger.Default))));

			expect(helpers.execGitCommandVoid).toHaveBeenCalledWith("push", [
				"upstream",
				"main",
			]);
		});
	});

	describe("Branch Operations", () => {
		it("should create branch", async () => {
			(helpers.execGitCommandVoid as any).mockReturnValue(Effect.succeed(void 0));

			const program = Effect.gen(function* () {
				const git = yield* Git;
				return yield* git.createBranch("feature-branch");
			});

			await  (Effect.runPromise as any)(program.pipe(Effect.provide(Layer.mergeAll(Git.Default, Execution.Default, Display.Default, Logger.Default))));

			expect(helpers.execGitCommandVoid).toHaveBeenCalledWith("branch", [
				"feature-branch",
			]);
		});

		it("should checkout branch", async () => {
			(helpers.execGitCommandVoid as any).mockReturnValue(Effect.succeed(void 0));

			const program = Effect.gen(function* () {
				const git = yield* Git;
				return yield* git.checkoutBranch("feature-branch");
			});

			await  (Effect.runPromise as any)(program.pipe(Effect.provide(Layer.mergeAll(Git.Default, Execution.Default, Display.Default, Logger.Default))));

			expect(helpers.execGitCommandVoid).toHaveBeenCalledWith("checkout", [
				"feature-branch",
			]);
		});

		it("should delete branch", async () => {
			(helpers.execGitCommandVoid as any).mockReturnValue(Effect.succeed(void 0));

			const program = Effect.gen(function* () {
				const git = yield* Git;
				return yield* git.deleteBranch("feature-branch");
			});

			await  (Effect.runPromise as any)(program.pipe(Effect.provide(Layer.mergeAll(Git.Default, Execution.Default, Display.Default, Logger.Default))));

			expect(helpers.execGitCommandVoid).toHaveBeenCalledWith("branch", [
				"-D",
				"feature-branch",
			]);
		});
	});

	describe("Command Execution", () => {
		it("should exec git command", async () => {
			(helpers.execGitCommand as any).mockReturnValue(
				Effect.succeed("output")
			);

			const program = Effect.gen(function* () {
				const git = yield* Git;
				return yield* git.exec("log", ["--oneline"]);
			});

			const result = await  (Effect.runPromise as any)(
				program.pipe(Effect.provide(Layer.mergeAll(Git.Default, Execution.Default, Display.Default, Logger.Default)))
			);

			expect(result).toBe("output");
			expect(helpers.execGitCommand).toHaveBeenCalledWith("log", ["--oneline"]);
		});

		it("should exec git command void", async () => {
			(helpers.execGitCommandVoid as any).mockReturnValue(Effect.succeed(void 0));

			const program = Effect.gen(function* () {
				const git = yield* Git;
				return yield* git.execVoid("reset", ["--hard"]);
			});

			await  (Effect.runPromise as any)(program.pipe(Effect.provide(Layer.mergeAll(Git.Default, Execution.Default, Display.Default, Logger.Default))));

			expect(helpers.execGitCommandVoid).toHaveBeenCalledWith("reset", [
				"--hard",
			]);
		});
	});

	describe("Error Handling", () => {
		it("should propagate GitCommandError", async () => {
			const error = GitCommandError.make("branch", ["--show-current"], "Command failed");
			(helpers.execGitCommand as any).mockReturnValueOnce(Effect.fail(error));

			const program = Effect.gen(function* () {
				const git = yield* Git;
				return yield* git.getCurrentBranch();
			});

			// Effect wraps errors in FiberFailure, so we need to check the cause
			let caughtError: any;
			try {
				await  (Effect.runPromise as any)(program.pipe(Effect.provide(Layer.mergeAll(Git.Default, Execution.Default, Display.Default, Logger.Default))));
			} catch (fiberFailure: any) {
				caughtError = fiberFailure;
			}

			expect(caughtError).toBeDefined();
			// Check if the error message contains our expected error message
			expect(String(caughtError)).toContain("Command failed");
		});
	});
});
