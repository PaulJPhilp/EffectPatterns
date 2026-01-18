/**
 * Git Utilities Tests
 */

import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { execGitCommand, getCommitsSinceTag, getLatestTag } from "../git.js";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

import { execSync } from "node:child_process";

describe("Git Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("execGitCommand", () => {
    it("should execute git command with no arguments", async () => {
      const mockOutput = "branch-name";
      (execSync as any).mockReturnValue(mockOutput);

      const effect = execGitCommand("branch");
      const result = await Effect.runPromise(effect);

      expect(result).toBe(mockOutput);
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining("git branch"),
        expect.any(Object)
      );
    });

    it("should execute git command with arguments", async () => {
      const mockOutput = "commit message";
      (execSync as any).mockReturnValue(mockOutput);

      const effect = execGitCommand("log", ["-1", "--oneline"]);
      const result = await Effect.runPromise(effect);

      expect(result).toBe(mockOutput);
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining("git log -1 --oneline"),
        expect.any(Object)
      );
    });

    it("should trim output", async () => {
      (execSync as any).mockReturnValue("  output with spaces  \n");

      const effect = execGitCommand("status");
      const result = await Effect.runPromise(effect);

      expect(result).toBe("output with spaces");
    });

    it("should handle git command errors", async () => {
      const gitError = new Error("fatal: not a git repository");
      (execSync as any).mockImplementation(() => {
        throw gitError;
      });

      const effect = execGitCommand("status");

      try {
        await Effect.runPromise(effect);
        expect(true).toBe(false); // Should have thrown
      } catch (error: any) {
        expect(error.message).toContain("Git command failed");
      }
    });

    it("should use utf-8 encoding", async () => {
      (execSync as any).mockReturnValue("output");

      const effect = execGitCommand("config");
      await Effect.runPromise(effect);

      expect(execSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ encoding: "utf-8" })
      );
    });
  });

  describe("getLatestTag", () => {
    it("should get latest tag", async () => {
      const mockTag = "v1.2.3";
      (execSync as any).mockReturnValue(mockTag);

      const effect = getLatestTag();
      const result = await Effect.runPromise(effect);

      expect(result).toBe(mockTag);
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining("git describe --tags"),
        expect.any(Object)
      );
    });

    it("should return default tag when no tags exist", async () => {
      const error = new Error("fatal: No names found, cannot describe anything");
      (execSync as any).mockImplementation(() => {
        throw error;
      });

      const effect = getLatestTag();
      const result = await Effect.runPromise(effect);

      expect(result).toBe("v0.0.0");
    });

    it("should trim output", async () => {
      (execSync as any).mockReturnValue("  v2.0.0  \n");

      const effect = getLatestTag();
      const result = await Effect.runPromise(effect);

      expect(result).toBe("v2.0.0");
    });

    it("should use git describe command", async () => {
      (execSync as any).mockReturnValue("v1.0.0");

      const effect = getLatestTag();
      await Effect.runPromise(effect);

      expect(execSync).toHaveBeenCalledWith(
        "git describe --tags --abbrev=0",
        expect.any(Object)
      );
    });
  });

  describe("getCommitsSinceTag", () => {
    it("should get commits since tag", async () => {
      const mockOutput = "commit 1\n==END==\ncommit 2\n==END==";
      (execSync as any).mockReturnValue(mockOutput);

      const effect = getCommitsSinceTag("v1.0.0");
      const result = await Effect.runPromise(effect);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result).toContain("commit 1");
      expect(result).toContain("commit 2");
    });

    it("should include tag in git log command", async () => {
      (execSync as any).mockReturnValue("");

      const effect = getCommitsSinceTag("v2.5.0");
      await Effect.runPromise(effect);

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining("git log v2.5.0..HEAD"),
        expect.any(Object)
      );
    });

    it("should trim commit messages", async () => {
      const mockOutput = "  commit with spaces  \n==END==\n  another  \n==END==";
      (execSync as any).mockReturnValue(mockOutput);

      const effect = getCommitsSinceTag("v1.0.0");
      const result = await Effect.runPromise(effect);

      expect(result[0]).toBe("commit with spaces");
      expect(result[1]).toBe("another");
    });

    it("should filter out empty commits", async () => {
      const mockOutput = "commit 1\n==END==\n\n==END==\ncommit 2\n==END==";
      (execSync as any).mockReturnValue(mockOutput);

      const effect = getCommitsSinceTag("v1.0.0");
      const result = await Effect.runPromise(effect);

      expect(result.length).toBe(2);
      expect(result).not.toContain("");
    });

    it("should handle no commits since tag", async () => {
      (execSync as any).mockReturnValue("");

      const effect = getCommitsSinceTag("v1.0.0");
      const result = await Effect.runPromise(effect);

      expect(result).toEqual([]);
    });

    it("should handle git command errors", async () => {
      const gitError = new Error("fatal: bad revision");
      (execSync as any).mockImplementation(() => {
        throw gitError;
      });

      const effect = getCommitsSinceTag("v1.0.0");

      try {
        await Effect.runPromise(effect);
        expect(true).toBe(false); // Should have thrown
      } catch (error: any) {
        expect(error.message).toContain("Failed to get commits since");
      }
    });

    it("should use utf-8 encoding", async () => {
      (execSync as any).mockReturnValue("");

      const effect = getCommitsSinceTag("v1.0.0");
      await Effect.runPromise(effect);

      expect(execSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ encoding: "utf-8" })
      );
    });

    it("should handle multiline commit messages", async () => {
      const mockOutput = "line 1\nline 2\nline 3\n==END==\ncommit 2\n==END==";
      (execSync as any).mockReturnValue(mockOutput);

      const effect = getCommitsSinceTag("v1.0.0");
      const result = await Effect.runPromise(effect);

      expect(result[0]).toContain("line 1");
      expect(result[0]).toContain("line 2");
      expect(result[0]).toContain("line 3");
    });
  });
});
