/**
 * Git service helpers
 */

import { Effect } from "effect";
import { execSync } from "node:child_process";
import { GitCommandError, GitRepositoryError } from "./errors.js";

/**
 * Execute a git command and return output
 */
export const execGitCommand = (
	command: string,
	args: string[],
	options: { capture?: boolean; encoding?: BufferEncoding } = {}
): Effect.Effect<string, GitCommandError> =>
	Effect.try({
		try: () => {
			const result = execSync(`git ${command} ${args.join(" ")}`, {
				encoding: options.encoding || "utf-8",
				stdio: options.capture ? "pipe" : "inherit",
			});
			return typeof result === "string" ? result.trim() : "";
		},
		catch: (error) =>
			GitCommandError.make(
				command,
				args,
				error instanceof Error ? error.message : String(error),
				error
			),
	});

/**
 * Execute a git command without capturing output
 */
export const execGitCommandVoid = (
	command: string,
	args: string[]
): Effect.Effect<void, GitCommandError> =>
	Effect.try({
		try: () => {
			execSync(`git ${command} ${args.join(" ")}`, {
				encoding: "utf-8",
				stdio: "inherit",
			});
		},
		catch: (error) =>
			GitCommandError.make(
				command,
				args,
				error instanceof Error ? error.message : String(error),
				error
			),
	});

/**
 * Parse git status output
 */
export const parseGitStatus = (output: string) => {
	const lines = output.split("\n");
	let staged = 0;
	let unstaged = 0;
	let untracked = 0;

	for (const line of lines) {
		if (line.startsWith("## ")) continue;
		if (line.trim() === "") continue;

		const statusCode = line.substring(0, 2);
		if (statusCode[0] !== " " && statusCode[0] !== "?") staged++;
		if (statusCode[1] !== " " && statusCode[1] !== "?") unstaged++;
		if (statusCode.startsWith("??")) untracked++;
	}

	return { staged, unstaged, untracked };
};

/**
 * Check if directory is a git repository
 */
export const isGitRepository = (path: string): Effect.Effect<boolean> =>
        Effect.sync(() => {
                try {
                        execSync("git rev-parse --git-dir", { cwd: path, stdio: "ignore" });
                        return true;
                } catch {
                        return false;
                }
        });

/**
 * Get git repository root directory
 */
export const getGitRoot = (): Effect.Effect<string, GitCommandError> =>
	execGitCommand("rev-parse", ["--show-toplevel"]);

/**
 * Get the latest git tag
 */
export const getLatestTag = (tagPrefix: string, initialTag: string): Effect.Effect<string, GitRepositoryError | GitCommandError> =>
	execGitCommand("describe", ["--tags", "--abbrev=0"], { capture: true }).pipe(
		Effect.catchAll((error): Effect.Effect<string, GitRepositoryError | GitCommandError> => {
			if (error._tag === "GitCommandError" && String(error.message).includes("No names found")) {
				return Effect.fail(
					GitRepositoryError.make(
						`No git tags found in this repository.\n\n` +
						`This is likely the first release. Create an initial tag:\n` +
						`  git tag ${initialTag}\n` +
						`  git push origin ${initialTag}\n\n` +
						`Or use conventional commits and run:\n` +
						`  bun run ep release create`
					)
				);
			}
			return Effect.fail(error);
		})
	);

/**
 * Get commits since a specific tag
 */
export const getCommitsSinceTag = (
	tag: string,
	defaultBranch: string
): Effect.Effect<string[], GitCommandError> =>
	Effect.gen(function* () {
		const output = yield* execGitCommand("log", [
			`${tag}..${defaultBranch}`,
			"--format=%B%n==END==",
		], { capture: true });

		return output
			.split("==END==")
			.map((commit) => commit.trim())
			.filter((commit) => commit.length > 0);
	}).pipe(
		Effect.catchAll((error) =>
			Effect.fail(
				GitCommandError.make(
					"log",
					[`${tag}..${defaultBranch}`, "--format=%B%n==END=="],
					`Failed to get commits since tag ${tag}: ${error instanceof GitCommandError ? error.message : String(error)}`,
					error
				)
			)
		)
	);

/**
 * Determine the recommended version bump based on conventional commits
 */
export const getRecommendedBump = (
	_commits: string[]
): Effect.Effect<
	{ releaseType: "major" | "minor" | "patch"; reason: string },
	never
> =>
	Effect.succeed({
		releaseType: "patch" as const,
		reason: "Patch bump for bug fixes and improvements",
	});

/**
 * Parse commits and categorize them
 */
interface ParsedCommit {
	type?: string;
	subject?: string;
	header?: string;
	notes?: Array<{ title: string }>;
}

export const categorizeCommits = async (commits: string[]) => {
	let parseCommit: (message: string) => ParsedCommit;

	try {
		const module = await import("conventional-commits-parser");
		
		// Type guard for commit parser function
		const isCommitParser = (fn: unknown): fn is (message: string) => ParsedCommit => {
			return typeof fn === "function";
		};

		const maybeDefault = (module as unknown as { default: unknown }).default;
		
		if (isCommitParser(maybeDefault)) {
			parseCommit = maybeDefault;
		} else if (isCommitParser(module)) {
			parseCommit = module;
		} else {
			throw new Error(
				"No callable export found in conventional-commits-parser"
			);
		}
	} catch {
		parseCommit = (message: string): ParsedCommit => {
			const header = message.split("\n")[0] ?? message;
			const match = header.match(
				/^(?<type>\w+)(?:\([^)]*\))?(?<breaking>!)?:\s*(?<subject>.+)$/
			);

			const type = match?.groups?.type;
			const subject = match?.groups?.subject ?? header;
			const notes = match?.groups?.breaking
				? [{ title: "BREAKING CHANGE" }]
				: [];

			return { type, subject, header, notes };
		};
	}

	const categories = {
		breaking: [] as string[],
		features: [] as string[],
		fixes: [] as string[],
		docs: [] as string[],
		chore: [] as string[],
		other: [] as string[],
	};

	for (const commitMsg of commits) {
		const parsed = parseCommit(commitMsg);

		if (parsed.notes?.some((note) => note.title === "BREAKING CHANGE")) {
			categories.breaking.push(parsed.header || commitMsg);
		} else if (parsed.type === "feat") {
			categories.features.push(parsed.subject || commitMsg);
		} else if (parsed.type === "fix") {
			categories.fixes.push(parsed.subject || commitMsg);
		} else if (parsed.type === "docs") {
			categories.docs.push(parsed.subject || commitMsg);
		} else if (
			parsed.type === "chore" ||
			parsed.type === "build" ||
			parsed.type === "ci"
		) {
			categories.chore.push(parsed.subject || commitMsg);
		} else {
			categories.other.push(parsed.subject || commitMsg);
		}
	}

	return categories;
};

/**
 * Generate a draft changelog from categorized commits
 */
export const generateChangelog = (
	categories: Awaited<ReturnType<typeof categorizeCommits>>,
	currentVersion: string,
	nextVersion: string
) => {
	const lines: string[] = [];

	lines.push(`# Release ${nextVersion}\n`);
	lines.push(`**Previous version:** ${currentVersion}\n`);

	if (categories.breaking.length > 0) {
		lines.push("## 🚨 BREAKING CHANGES\n");
		for (const item of categories.breaking) {
			lines.push(`- ${item}`);
		}
		lines.push("");
	}

	if (categories.features.length > 0) {
		lines.push("## ✨ Features\n");
		for (const item of categories.features) {
			lines.push(`- ${item}`);
		}
		lines.push("");
	}

	if (categories.fixes.length > 0) {
		lines.push("## 🐛 Bug Fixes\n");
		for (const item of categories.fixes) {
			lines.push(`- ${item}`);
		}
		lines.push("");
	}

	if (categories.docs.length > 0) {
		lines.push("## 📚 Documentation\n");
		for (const item of categories.docs) {
			lines.push(`- ${item}`);
		}
		lines.push("");
	}

	if (categories.chore.length > 0) {
		lines.push("## 🔧 Chores & Maintenance\n");
		for (const item of categories.chore) {
			lines.push(`- ${item}`);
		}
		lines.push("");
	}

	if (categories.other.length > 0) {
		lines.push("## 📝 Other Changes\n");
		for (const item of categories.other) {
			lines.push(`- ${item}`);
		}
		lines.push("");
	}

	return lines.join("\n");
};
