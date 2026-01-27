/**
 * Git Utilities
 */

import { Effect } from "effect";
import { execSync } from "node:child_process";

/**
 * Execute a git command and return the output
 */
export const execGitCommand = (
  command: string,
  args: string[] = []
): Effect.Effect<string, Error> =>
  Effect.try({
    try: () => execSync(`git ${command} ${args.join(" ")}`, { encoding: "utf-8" }).trim(),
    catch: (error) => new Error(`Git command failed: ${error}`),
  });

/**
 * Get the latest git tag
 */
export const getLatestTag = (): Effect.Effect<string, Error> =>
  Effect.sync(() => {
    try {
      return execSync("git describe --tags --abbrev=0", { encoding: "utf-8" }).trim();
    } catch {
      // Fallback if no tags exist
      return "v0.0.0";
    }
  }).pipe(
    Effect.mapError((error) => new Error(`Failed to get latest tag: ${error}`))
  );

/**
 * Get all commits since the last tag with full bodies
 */
export const getCommitsSinceTag = (tag: string): Effect.Effect<string[], Error> =>
  Effect.try({
    try: () => {
      const commits = execSync(`git log ${tag}..HEAD --format=%B%n==END==`, {
        encoding: "utf-8",
      })
        .split("==END==")
        .map((commit) => commit.trim())
        .filter((commit) => commit.length > 0);
      return commits;
    },
    catch: (error) => new Error(`Failed to get commits since ${tag}: ${error}`),
  });
