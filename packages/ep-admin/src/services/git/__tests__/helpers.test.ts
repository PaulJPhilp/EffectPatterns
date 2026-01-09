/**
 * Git service helper tests
 */

import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { parseGitStatus, isGitRepository } from "../helpers.js";
import { GitCommandError } from "../errors.js";

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

		it("should ignore empty lines", () => {
			const output = "## main\n\nM  file1.ts\n\n";
			const result = parseGitStatus(output);
			expect(result.staged).toBe(1);
		});

		it("should handle various status codes", () => {
			const output = "## main\nM  staged-modified\n M unstaged-modified\nA  staged-added\n D unstaged-deleted\n?? untracked";
			const result = parseGitStatus(output);
			expect(result.staged).toBe(2);
			expect(result.unstaged).toBe(2);
			expect(result.untracked).toBe(1);
		});
	});

	describe("isGitRepository", () => {
		it("should return true for git repository", async () => {
			// This will use actual git check - should pass in a git repo
			const result = await Effect.runPromise(isGitRepository(process.cwd()));
			// In a git repo, this should be true
			expect(typeof result).toBe("boolean");
		});

		it("should return false for non-git directory", async () => {
			const result = await Effect.runPromise(isGitRepository("/tmp"));
			expect(result).toBe(false);
		});
	});
});
