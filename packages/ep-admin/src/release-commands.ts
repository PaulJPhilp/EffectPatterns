/**
 * Release management commands
 * 
 * Preview and create releases with conventional commits
 */

import { Command, Prompt } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Console, Effect } from "effect";
import { execSync } from "node:child_process";
import * as path from "node:path";
import * as semver from "semver";
import { showPanel } from "./services/display.js";
import {
	categorizeCommits,
	execGitCommand,
	generateChangelog,
	getCommitsSinceTag,
	getLatestTag,
	getRecommendedBump,
} from "./services/git.js";
import { colorize, getProjectRoot } from "./utils.js";

const PROJECT_ROOT = getProjectRoot();

/**
 * Convert a title to a URL-safe kebab-case filename
 */
export const toKebabCase = (str: string): string =>
	str
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

/**
 * Analyze release - shared logic for preview and create
 */
const analyzeRelease = () =>
	Effect.gen(function* () {
		const latestTag = yield* getLatestTag();
		const currentVersion = latestTag.replace(/^v/, "");
		const commits = yield* getCommitsSinceTag(latestTag);

		if (commits.length === 0) {
			return { hasChanges: false } as const;
		}

		const bump = yield* getRecommendedBump(commits);
		const nextVersion = semver.inc(currentVersion, bump.releaseType);

		if (!nextVersion) {
			return yield* Effect.fail(
				new Error(`Failed to calculate next version from ${currentVersion}`)
			);
		}

		const categories = yield* Effect.tryPromise({
			try: () => categorizeCommits(commits),
			catch: (error) =>
				new Error(
					`Failed to categorize commits: ${error instanceof Error ? error.message : String(error)
					}`
				),
		});

		const changelog = generateChangelog(
			categories,
			currentVersion,
			nextVersion
		);

		return {
			hasChanges: true,
			latestTag,
			currentVersion,
			nextVersion,
			bump,
			commits,
			categories,
			changelog,
		} as const;
	});

/**
 * release:preview - Preview the next release
 */
export const releasePreviewCommand = Command.make("preview", {
	options: {},
	args: {},
}).pipe(
	Command.withDescription(
		"Preview the next release based on conventional commits"
	),
	Command.withHandler(() =>
		Effect.gen(function* () {
			yield* Console.log(colorize("\n🔍 Analyzing commits...\n", "bright"));

			const analysis = yield* analyzeRelease();

			if (!analysis.hasChanges) {
				yield* Console.log(
					colorize("✓ No new commits since last release\n", "green")
				);
				return;
			}

			yield* Console.log("━".repeat(60));
			yield* Console.log(
				colorize(`📦 Release Preview: v${analysis.nextVersion}`, "bright")
			);
			yield* Console.log("━".repeat(60));
			yield* Console.log(
				`Current version: ${colorize(analysis.currentVersion, "dim")}`
			);
			yield* Console.log(
				`Next version:    ${colorize(analysis.nextVersion, "green")}`
			);
			yield* Console.log(
				`Bump type:       ${colorize(analysis.bump.releaseType, "cyan")}`
			);
			yield* Console.log(
				`Commits:         ${colorize(String(analysis.commits.length), "yellow")}`
			);
			yield* Console.log("━".repeat(60));
			yield* Console.log("");
			yield* Console.log(analysis.changelog);
			yield* Console.log("━".repeat(60));
			yield* Console.log(
				colorize("\n💡 To create this release, run:", "dim")
			);
			yield* Console.log(colorize("   bun run ep release create\n", "cyan"));
		})
	)
);

/**
 * release:create - Create and publish a new release
 */
export const releaseCreateCommand = Command.make("create", {
	options: {},
	args: {},
}).pipe(
	Command.withDescription(
		"Create and publish a new release with git tag and changelog"
	),
	Command.withHandler(() =>
		Effect.gen(function* () {
			yield* Console.log(colorize("\n🚀 Creating Release\n", "bright"));

			const analysis = yield* analyzeRelease();

			if (!analysis.hasChanges) {
				yield* Console.log(
					colorize("✓ No new commits since last release\n", "green")
				);
				return;
			}

			const { nextVersion, changelog } = analysis;

			yield* Console.log("━".repeat(60));
			yield* Console.log(
				colorize(`Creating release: v${nextVersion}`, "bright")
			);
			yield* Console.log("━".repeat(60));
			yield* Console.log("");

			const fs = yield* FileSystem.FileSystem;

			// 1. Update package.json
			yield* Console.log("📝 Updating package.json...");
			const packageJsonPath = "package.json";
			const packageJsonContent = yield* fs.readFileString(packageJsonPath);
			const packageJson = yield* Effect.try({
				try: () => JSON.parse(packageJsonContent),
				catch: (error) =>
					new Error(
						"Failed to parse package.json.\n" +
						"The file may be corrupted or contain invalid JSON.\n\n" +
						`Error: ${error instanceof Error ? error.message : String(error)}`
					),
			}).pipe(
				Effect.catchAll((error) =>
					Effect.gen(function* () {
						yield* Console.error(
							colorize("\n❌ Invalid package.json\n", "red")
						);
						yield* Console.error(String(error).replace("Error: ", ""));
						yield* Console.error("");
						return yield* Effect.fail(error);
					})
				)
			);

			packageJson.version = nextVersion;
			yield* fs
				.writeFileString(
					packageJsonPath,
					`${JSON.stringify(packageJson, null, 2)}\n`
				)
				.pipe(
					Effect.catchAll((error) =>
						Effect.gen(function* () {
							yield* Console.error(
								colorize("\n❌ Failed to write package.json\n", "red")
							);
							yield* Console.error(
								"Check file permissions and disk space.\n"
							);
							yield* Console.error(`Error: ${error}\n`);
							return yield* Effect.fail(
								new Error("Cannot write package.json")
							);
						})
					)
				);
			yield* Console.log(`   ✓ Version updated to ${nextVersion}`);

			// 2. Update CHANGELOG.md
			yield* Console.log("📝 Updating CHANGELOG.md...");
			const changelogPath = "docs/CHANGELOG.md";

			const changelogExists = yield* Effect.try({
				try: () => execSync("test -f docs/CHANGELOG.md", { stdio: "ignore" }),
				catch: () => false,
			});

			let existingChangelog = "";
			if (changelogExists) {
				existingChangelog = yield* fs.readFileString(changelogPath);
			}

			const newChangelog = `${changelog}\n\n${existingChangelog}`;
			yield* fs.writeFileString(changelogPath, newChangelog);
			yield* Console.log("   ✓ Changelog updated");

			// 3. Git add
			yield* Console.log("📦 Staging changes...");
			yield* execGitCommand("add", ["package.json", "docs/CHANGELOG.md"]);
			yield* Console.log("   ✓ Files staged");

			// 4. Git commit
			yield* Console.log("💾 Creating commit...");
			yield* execGitCommand("commit", [
				"-m",
				`"chore(release): v${nextVersion}"`,
			]);
			yield* Console.log(
				`   ✓ Commit created: chore(release): v${nextVersion}`
			);

			// 5. Git tag
			yield* Console.log("🏷️  Creating tag...");
			yield* execGitCommand("tag", [`v${nextVersion}`]);
			yield* Console.log(`   ✓ Tag created: v${nextVersion}`);

			// 6. Git push
			yield* Console.log("🚀 Pushing to remote...");
			yield* execGitCommand("push", ["--follow-tags"]);
			yield* Console.log("   ✓ Changes pushed to remote");

			yield* Console.log("\n━".repeat(60));
			yield* Console.log(
				`✨ Release v${nextVersion} completed successfully!`
			);
			yield* Console.log("━".repeat(60));
			yield* Console.log(`\n📌 Tag: v${nextVersion}`);
			yield* Console.log(`📝 Commit: chore(release): v${nextVersion}`);
			yield* Console.log("🚀 Pushed to remote with tags\n");
		})
	)
);

/**
 * pattern:new - Scaffold a new pattern
 */
export const patternNewCommand = Command.make("new", {
	options: {},
	args: {},
}).pipe(
	Command.withDescription(
		"Create a new pattern with interactive wizard and scaffolded files."
	),
	Command.withHandler(() =>
		Effect.gen(function* () {
			yield* Console.log("\n✨ Creating a new pattern\n");

			// Prompt for title
			const titlePrompt = Prompt.text({
				message: "Pattern title:",
			});
			const title = yield* titlePrompt;

			// Prompt for skill level
			const skillLevelPrompt = Prompt.select({
				message: "Skill level:",
				choices: [
					{ title: "Beginner", value: "Beginner" },
					{ title: "Intermediate", value: "Intermediate" },
					{ title: "Advanced", value: "Advanced" },
				],
			});
			const skillLevel = yield* skillLevelPrompt;

			// Prompt for use case
			const useCasePrompt = Prompt.select({
				message: "Use case:",
				choices: [
					{ title: "Concurrency", value: "Concurrency" },
					{ title: "Error Handling", value: "Error Handling" },
					{ title: "Resource Management", value: "Resource Management" },
					{ title: "State Management", value: "State Management" },
					{ title: "Data Structures", value: "Data Structures" },
				],
			});
			const useCase = yield* useCasePrompt;

			// Prompt for summary
			const summaryPrompt = Prompt.text({
				message: "Brief summary (one line):",
			});
			const summary = yield* summaryPrompt;

			// Generate kebab-case filename
			const filename = toKebabCase(title);

			if (!filename || filename.length === 0) {
				yield* Console.error(colorize("\n❌ Invalid pattern title\n", "red"));
				yield* Console.error(
					"The title must contain at least one alphanumeric character.\n"
				);
				yield* Console.error(
					colorize("Examples of valid titles:\n", "bright")
				);
				yield* Console.error('  • "Retry with Exponential Backoff"');
				yield* Console.error('  • "Resource Pool Pattern"');
				yield* Console.error('  • "Circuit Breaker"\n');
				return yield* Effect.fail(new Error("Invalid title"));
			}

			yield* Console.log(`\n📝 Creating files for: ${filename}\n`);

			const fs = yield* FileSystem.FileSystem;

			// Check if pattern already exists
			const mdxPath = path.join(
				PROJECT_ROOT,
				`content/new/raw/${filename}.mdx`
			);
			const tsPath = path.join(PROJECT_ROOT, `content/new/src/${filename}.ts`);

			const mdxExists = yield* fs.exists(mdxPath);
			const tsExists = yield* fs.exists(tsPath);

			if (mdxExists || tsExists) {
				yield* Console.error(colorize("\n❌ Pattern already exists\n", "red"));
				if (mdxExists) {
					yield* Console.error(`  File exists: ${mdxPath}`);
				}
				if (tsExists) {
					yield* Console.error(`  File exists: ${tsPath}`);
				}
				yield* Console.error("\n");
				yield* Console.error(colorize("Options:\n", "bright"));
				yield* Console.error("  1. Use a different pattern name");
				yield* Console.error("  2. Delete the existing files:");
				yield* Console.error(colorize(`     rm ${mdxPath} ${tsPath}\n`, "cyan"));
				yield* Console.error("  3. Edit the existing pattern files directly\n");
				return yield* Effect.fail(new Error("Pattern already exists"));
			}

			// Ensure directories exist
			yield* fs
				.makeDirectory(path.join(PROJECT_ROOT, "content/new/raw"), {
					recursive: true,
				})
				.pipe(
					Effect.catchAll((error) =>
						Effect.gen(function* () {
							yield* Console.error(
								colorize(
									"\n❌ Failed to create content/new/raw directory\n",
									"red"
								)
							);
							yield* Console.error("Check directory permissions.\n");
							yield* Console.error(`Error: ${error}\n`);
							return yield* Effect.fail(new Error("Cannot create directory"));
						})
					)
				);

			yield* fs
				.makeDirectory(path.join(PROJECT_ROOT, "content/new/src"), {
					recursive: true,
				})
				.pipe(
					Effect.catchAll((error) =>
						Effect.gen(function* () {
							yield* Console.error(
								colorize(
									"\n❌ Failed to create content/new/src directory\n",
									"red"
								)
							);
							yield* Console.error("Check directory permissions.\n");
							yield* Console.error(`Error: ${error}\n`);
							return yield* Effect.fail(new Error("Cannot create directory"));
						})
					)
				);

			// Create MDX file
			const mdxContent = `---
id: ${filename}
title: '${title}'
skillLevel: '${skillLevel}'
useCase: '${useCase}'
summary: '${summary}'
---

## Good Example

## Anti-Pattern

## Rationale
`;

			yield* fs.writeFileString(mdxPath, mdxContent).pipe(
				Effect.catchAll((error) =>
					Effect.gen(function* () {
						yield* Console.error(
							colorize("\n❌ Failed to create MDX file\n", "red")
						);
						yield* Console.error(`Path: ${mdxPath}\n`);
						yield* Console.error("Check file permissions and disk space.\n");
						yield* Console.error(`Error: ${error}\n`);
						return yield* Effect.fail(new Error("Cannot create MDX file"));
					})
				)
			);
			yield* Console.log(colorize(`✓ Created: ${mdxPath}`, "green"));

			// Create TypeScript file
			const tsContent = `import { Effect } from "effect";

// Add your TypeScript example code here
// This effect should successfully run
Effect.runSync(Effect.succeed("Hello, World!"));
`;

			yield* fs.writeFileString(tsPath, tsContent).pipe(
				Effect.catchAll((error) =>
					Effect.gen(function* () {
						yield* Console.error(
							colorize("\n❌ Failed to create TypeScript file\n", "red")
						);
						yield* Console.error(`Path: ${tsPath}\n`);
						yield* Console.error("Check file permissions and disk space.\n");
						yield* Console.error(`Error: ${error}\n`);
						return yield* Effect.fail(
							new Error("Cannot create TypeScript file")
						);
					})
				)
			);
			yield* Console.log(colorize(`✓ Created: ${tsPath}`, "green"));

			// Display success panel with pattern details
			yield* showPanel(
				`Files created successfully!

MDX File: ${mdxPath}
TypeScript File: ${tsPath}

Pattern Details:
  Title: ${title}
  Skill Level: ${skillLevel}
  Use Case: ${useCase}
  Summary: ${summary}

Next steps:
  1. Edit the MDX file to add pattern documentation
  2. Edit the TypeScript file to add working examples
  3. Run 'bun ep validate' to check your pattern
  4. Run 'bun ep publish' to add to the pattern library`,
				"Pattern Scaffolding Complete",
				{ type: "success" }
			);
		})
	)
);

/**
 * Compose release commands
 */
export const releaseCommand = Command.make("release").pipe(
	Command.withDescription("Release management and versioning"),
	Command.withSubcommands([releasePreviewCommand, releaseCreateCommand])
);
