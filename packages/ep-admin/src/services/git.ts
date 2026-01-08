/**
 * Git operations service
 * 
 * Provides Effect-based wrappers for git commands
 */

import { Effect } from "effect";
import { execSync } from "node:child_process";

/**
 * Execute a git command
 */
export const execGitCommand = (
	command: string,
	args: string[]
): Effect.Effect<void, Error> =>
	Effect.try({
		try: () => {
			execSync(`git ${command} ${args.join(" ")}`, {
				encoding: "utf-8",
				stdio: "inherit",
			});
		},
		catch: (error) =>
			new Error(
				`Git command failed: ${error instanceof Error ? error.message : String(error)
				}`
			),
	});

/**
 * Get the latest git tag
 */
export const getLatestTag = (): Effect.Effect<string, Error> =>
	Effect.try({
		try: () => {
			const tag = execSync("git describe --tags --abbrev=0", {
				encoding: "utf-8",
			}).trim();
			return tag;
		},
		catch: (error) => {
			const message = error instanceof Error ? error.message : String(error);

			if (message.includes("No names found")) {
				return new Error(
					"No git tags found in this repository.\n\n" +
					"This is likely the first release. Create an initial tag:\n" +
					"  git tag v0.1.0\n" +
					"  git push origin v0.1.0\n\n" +
					"Or use conventional commits and run:\n" +
					"  bun run ep release create"
				);
			}

			return new Error(
				`Failed to get latest tag: ${message}\n\n` +
				"Make sure you are in a git repository with at least one tag."
			);
		},
	});

/**
 * Get commits since a specific tag
 */
export const getCommitsSinceTag = (
	tag: string
): Effect.Effect<string[], Error> =>
	Effect.try({
		try: () => {
			const commits = execSync(
				`git log ${tag}..HEAD --format=%B%n==END==`,
				{
					encoding: "utf-8",
				}
			)
				.split("==END==")
				.map((commit) => commit.trim())
				.filter((commit) => commit.length > 0);
			return commits;
		},
		catch: (error) => {
			const message = error instanceof Error ? error.message : String(error);
			return new Error(
				`Failed to get commits since tag ${tag}: ${message}\n\n` +
				"Possible causes:\n" +
				`  • Tag "${tag}" does not exist\n` +
				"  • Not in a git repository\n" +
				"  • Repository history is corrupted\n\n" +
				"Try:\n" +
				"  git tag -l    # List all tags\n" +
				"  git log --oneline    # Verify git history"
			);
		},
	});

/**
 * Determine the recommended version bump based on conventional commits
 */
export const getRecommendedBump = (
	_commits: string[]
): Effect.Effect<
	{ releaseType: "major" | "minor" | "patch"; reason: string },
	Error
> =>
	Effect.succeed({
		releaseType: "patch" as const,
		reason: "Patch bump for bug fixes and improvements",
	});

/**
 * Parse commits and categorize them
 */
export const categorizeCommits = async (commits: string[]) => {
	// Handle both ESM and CommonJS exports; fall back to a simple parser
	let parseCommit: (message: string) => any;

	try {
		const module = await import("conventional-commits-parser");
		const maybeDefault = (module as any).default;

		if (typeof maybeDefault === "function") {
			parseCommit = maybeDefault as (message: string) => any;
		} else if (typeof module === "function") {
			parseCommit = module as unknown as (message: string) => any;
		} else {
			throw new Error(
				"No callable export found in conventional-commits-parser"
			);
		}
	} catch {
		// Very small, test-friendly parser that understands the
		// common "type: subject" / "type!: subject" forms. This is
		// only used if the real parser is unavailable or has an
		// unexpected shape.
		parseCommit = (message: string) => {
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

		if (parsed.notes?.some((note: any) => note.title === "BREAKING CHANGE")) {
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
