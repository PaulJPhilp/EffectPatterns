/**
 * Git service helper tests
 *
 * // test-policy-ignore-file: structural mock — mocks execSync to test git command wrappers without requiring a git repo
 */

import { Effect } from "effect";
import { execSync } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import {
    categorizeCommits,
    execGitCommand,
    execGitCommandVoid,
    generateChangelog,
    getCommitsSinceTag,
    getLatestTag,
    isGitRepository,
    parseGitStatus
} from "../helpers.js";

vi.mock("node:child_process", () => ({
	execSync: vi.fn(),
}));

describe("Git Helpers", () => {
	describe("parseGitStatus", () => {
		it("should parse clean status", () => {
			const output = "## main\n";
			const result = parseGitStatus(output);
			expect(result.staged).toBe(0);
			expect(result.unstaged).toBe(0);
			expect(result.untracked).toBe(0);
		});

		it("should parse staged files", () => {
			const output = "## main\nM  file1.ts\nA  file2.ts";
			const result = parseGitStatus(output);
			expect(result.staged).toBe(2);
			expect(result.unstaged).toBe(0);
			expect(result.untracked).toBe(0);
		});

		it("should parse unstaged files", () => {
			const output = "## main\n M file1.ts\n D file2.ts";
			const result = parseGitStatus(output);
			expect(result.staged).toBe(0);
			expect(result.unstaged).toBe(2);
			expect(result.untracked).toBe(0);
		});

		it("should parse untracked files", () => {
			const output = "## main\n?? file1.ts\n?? file2.ts";
			const result = parseGitStatus(output);
			expect(result.staged).toBe(0);
			expect(result.unstaged).toBe(0);
			expect(result.untracked).toBe(2);
		});

		it("should parse mixed status", () => {
			const output = "## main\nM  file1.ts\n M file2.ts\n?? file3.ts";
			const result = parseGitStatus(output);
			expect(result.staged).toBe(1);
			expect(result.unstaged).toBe(1);
			expect(result.untracked).toBe(1);
		});

		it("should handle empty output", () => {
			const result = parseGitStatus("");
			expect(result.staged).toBe(0);
			expect(result.unstaged).toBe(0);
			expect(result.untracked).toBe(0);
		});
	});

	describe("execGitCommand", () => {
		it("should execute command and return output", async () => {
			(execSync as any).mockReturnValue("  output  ");
			const result = await Effect.runPromise(execGitCommand("status", ["-s"]));
			expect(result).toBe("output");
			expect(execSync).toHaveBeenCalledWith("git status -s", expect.anything());
		});

		it("should fail on command error", async () => {
			(execSync as any).mockImplementation(() => { throw new Error("Git error"); });
			const result = await Effect.runPromise(Effect.flip(execGitCommand("status", [])));
			expect(result._tag).toBe("GitCommandError");
		});
	});

	describe("execGitCommandVoid", () => {
		it("should execute command", async () => {
			(execSync as any).mockReturnValue("");
			await Effect.runPromise(execGitCommandVoid("add", ["."]));
			expect(execSync).toHaveBeenCalledWith("git add .", expect.anything());
		});
	});

	describe("getLatestTag", () => {
		it("should return latest tag on success", async () => {
			(execSync as any).mockReturnValue("v1.0.0");
			const result = await Effect.runPromise(getLatestTag("v", "v0.1.0"));
			expect(result).toBe("v1.0.0");
		});

		it("should throw GitRepositoryError if no tags found", async () => {
			const error = new Error("fatal: No names found, cannot describe anything.");
			(execSync as any).mockImplementation(() => { throw error; });
			const result = await Effect.runPromise(Effect.flip(getLatestTag("v", "v0.1.0")));
			expect(result._tag).toBe("GitRepositoryError");
		});
	});

	describe("getCommitsSinceTag", () => {
		it("should return list of commits", async () => {
			(execSync as any).mockReturnValue("commit1\n==END==\ncommit2\n==END==");
			const result = await Effect.runPromise(getCommitsSinceTag("v1.0.0", "main"));
			expect(result).toEqual(["commit1", "commit2"]);
		});
	});

	describe("categorizeCommits", () => {
		it("should categorize commits correctly", async () => {
			const commits = [
				"feat: add feature",
				"fix: fix bug",
				"docs: update readme",
				"feat!: breaking feature",
				"chore: update deps"
			];
			const categories = await categorizeCommits(commits);
			expect(categories.features).toContain("add feature");
			expect(categories.fixes).toContain("fix bug");
			expect(categories.docs).toContain("update readme");
			expect(categories.breaking).toContain("feat!: breaking feature");
			expect(categories.chore).toContain("update deps");
		});
	});

	describe("generateChangelog", () => {
		it("should generate changelog markdown", () => {
			const categories = {
				breaking: ["feat!: breaking"],
				features: ["feat: new"],
				fixes: ["fix: bug"],
				docs: ["docs: readme"],
				chore: ["chore: deps"],
				other: ["random commit"]
			};
			const changelog = generateChangelog(categories as any, "1.0.0", "1.1.0");
			expect(changelog).toContain("# Release 1.1.0");
			expect(changelog).toContain("## 🚨 BREAKING CHANGES");
			expect(changelog).toContain("## ✨ Features");
			expect(changelog).toContain("## 🐛 Bug Fixes");
		});
	});

	describe("isGitRepository", () => {
		it("should return true for git repository", async () => {
			(execSync as any).mockReturnValue("/path/to/.git");
			const result = await Effect.runPromise(isGitRepository(process.cwd()));
			expect(result).toBe(true);
		});

		it("should return false for non-git directory", async () => {
			(execSync as any).mockImplementation(() => { throw new Error(); });
			const result = await Effect.runPromise(isGitRepository("/tmp"));
			expect(result).toBe(false);
		});
	});
});
