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
import {
	CONTENT_DIRS,
	DISPLAY,
	GIT,
	PATHS,
	PATTERN,
	RELEASE,
} from "./constants.js";
import { Display } from "./services/display/index.js";
import {
	categorizeCommits,
	execGitCommand,
	execGitCommandVoid,
	generateChangelog,
	getCommitsSinceTag,
	getLatestTag,
	getRecommendedBump,
} from "./services/git/index.js";
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
		const latestTag = yield* getLatestTag(GIT.TAG_PREFIX, GIT.INITIAL_TAG);
		const currentVersion = latestTag.replace(new RegExp(`^${GIT.TAG_PREFIX}`), "");
		const commits = yield* getCommitsSinceTag(latestTag, GIT.DEFAULT_BRANCH);

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
			yield* Console.log(colorize("\n🔍 Analyzing commits...\n", "BRIGHT"));

			const analysis = yield* analyzeRelease();

			if (!analysis.hasChanges) {
				yield* Console.log(
					colorize("✓ No new commits since last release\n", "GREEN")
				);
				return;
			}

			yield* Console.log(DISPLAY.SEPARATOR_CHAR.repeat(DISPLAY.SEPARATOR_LENGTH));
			yield* Console.log(
				colorize(`📦 Release Preview: ${GIT.TAG_PREFIX}${analysis.nextVersion}`, "BRIGHT")
			);
			yield* Console.log(DISPLAY.SEPARATOR_CHAR.repeat(DISPLAY.SEPARATOR_LENGTH));
			yield* Console.log(
				`Current version: ${colorize(analysis.currentVersion, "DIM")}`
			);
			yield* Console.log(
				`Next version:    ${colorize(analysis.nextVersion, "GREEN")}`
			);
			yield* Console.log(
				`Bump type:       ${colorize(analysis.bump.releaseType, "CYAN")}`
			);
			yield* Console.log(
				`Commits:         ${colorize(String(analysis.commits.length), "YELLOW")}`
			);
			yield* Console.log(DISPLAY.SEPARATOR_CHAR.repeat(DISPLAY.SEPARATOR_LENGTH));
			yield* Console.log("");
			yield* Console.log(analysis.changelog);
			yield* Console.log(DISPLAY.SEPARATOR_CHAR.repeat(DISPLAY.SEPARATOR_LENGTH));
			yield* Console.log(
				colorize("\n💡 To create this release, run:", "DIM")
			);
			yield* Console.log(colorize("   bun run ep release create\n", "CYAN"));
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
			yield* Console.log(colorize("\n🚀 Creating Release\n", "BRIGHT"));

			const analysis = yield* analyzeRelease();

			if (!analysis.hasChanges) {
				yield* Console.log(
					colorize("✓ No new commits since last release\n", "GREEN")
				);
				return;
			}

			const { nextVersion, changelog } = analysis;

			yield* Console.log(DISPLAY.SEPARATOR_CHAR.repeat(DISPLAY.SEPARATOR_LENGTH));
			yield* Console.log(
				colorize(`Creating release: ${GIT.TAG_PREFIX}${nextVersion}`, "BRIGHT")
			);
			yield* Console.log(DISPLAY.SEPARATOR_CHAR.repeat(DISPLAY.SEPARATOR_LENGTH));
			yield* Console.log("");

			const fs = yield* FileSystem.FileSystem;

			// 1. Update package.json
			yield* Console.log(`📝 Updating ${PATHS.PACKAGE_JSON}...`);
			const packageJsonPath = PATHS.PACKAGE_JSON;
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
							colorize("\n❌ Invalid package.json\n", "RED")
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
								colorize("\n❌ Failed to write package.json\n", "RED")
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
			yield* Console.log(`📝 Updating ${PATHS.CHANGELOG}...`);
			const changelogPath = PATHS.CHANGELOG;

			const changelogExists = yield* Effect.try({
				try: () => execSync(`test -f ${PATHS.CHANGELOG}`, { stdio: "ignore" }),
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
			yield* execGitCommandVoid("add", [PATHS.PACKAGE_JSON, PATHS.CHANGELOG]);
			yield* Console.log("   ✓ Files staged");

			// 4. Git commit
			yield* Console.log("💾 Creating commit...");
			const commitMessage = `${RELEASE.COMMIT_PREFIX} ${GIT.TAG_PREFIX}${nextVersion}`;
			yield* execGitCommandVoid("commit", [
				"-m",
				commitMessage,
			]);
			yield* Console.log(
				`   ✓ Commit created: ${commitMessage}`
			);

			// 5. Git tag
			yield* Console.log("🏷️  Creating tag...");
			const tagName = `${GIT.TAG_PREFIX}${nextVersion}`;
			yield* execGitCommandVoid("tag", ["-a", tagName, "-m", commitMessage]);
			yield* Console.log(`   ✓ Tag created: ${tagName}`);

			// 6. Git push
			yield* Console.log("🚀 Pushing to remote...");
			yield* execGitCommandVoid("push", [GIT.DEFAULT_REMOTE, GIT.DEFAULT_BRANCH, "--follow-tags"]);
			yield* Console.log("   ✓ Changes pushed to remote");

			yield* Console.log(`\n${DISPLAY.SEPARATOR_CHAR.repeat(DISPLAY.SEPARATOR_LENGTH)}`);
			yield* Console.log(
				`✨ Release ${tagName} completed successfully!`
			);
			yield* Console.log(DISPLAY.SEPARATOR_CHAR.repeat(DISPLAY.SEPARATOR_LENGTH));
			yield* Console.log(`\n📌 Tag: ${tagName}`);
			yield* Console.log(`📝 Commit: ${commitMessage}`);
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
				choices: PATTERN.SKILL_LEVELS.map((level) => ({
					title: level,
					value: level,
				})),
			});
			const skillLevel = yield* skillLevelPrompt;

			// Prompt for use case
			const useCasePrompt = Prompt.select({
				message: "Use case:",
				choices: PATTERN.USE_CASES.map((useCase) => ({
					title: useCase,
					value: useCase,
				})),
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
				yield* Console.error(colorize("\n❌ Invalid pattern title\n", "RED"));
				yield* Console.error(
					"The title must contain at least one alphanumeric character.\n"
				);
				yield* Console.error(
					colorize("Examples of valid titles:\n", "BRIGHT")
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
				`${CONTENT_DIRS.NEW_RAW}/${filename}.mdx`
			);
			const tsPath = path.join(PROJECT_ROOT, `${CONTENT_DIRS.NEW_SRC}/${filename}.ts`);

			const mdxExists = yield* fs.exists(mdxPath);
			const tsExists = yield* fs.exists(tsPath);

			if (mdxExists || tsExists) {
				yield* Console.error(colorize("\n❌ Pattern already exists\n", "RED"));
				if (mdxExists) {
					yield* Console.error(`  File exists: ${mdxPath}`);
				}
				if (tsExists) {
					yield* Console.error(`  File exists: ${tsPath}`);
				}
				yield* Console.error("\n");
				yield* Console.error(colorize("Options:\n", "BRIGHT"));
				yield* Console.error("  1. Use a different pattern name");
				yield* Console.error("  2. Delete the existing files:");
				yield* Console.error(colorize(`     rm ${mdxPath} ${tsPath}\n`, "CYAN"));
				yield* Console.error("  3. Edit the existing pattern files directly\n");
				return yield* Effect.fail(new Error("Pattern already exists"));
			}

			// Ensure directories exist
			yield* fs
				.makeDirectory(path.join(PROJECT_ROOT, CONTENT_DIRS.NEW_RAW), {
					recursive: true,
				})
				.pipe(
					Effect.catchAll((error) =>
						Effect.gen(function* () {
							yield* Console.error(
								colorize(
									`\n❌ Failed to create ${CONTENT_DIRS.NEW_RAW} directory\n`,
									"RED"
								)
							);
							yield* Console.error("Check directory permissions.\n");
							yield* Console.error(`Error: ${error}\n`);
							return yield* Effect.fail(new Error("Cannot create directory"));
						})
					)
				);

			yield* fs
				.makeDirectory(path.join(PROJECT_ROOT, CONTENT_DIRS.NEW_SRC), {
					recursive: true,
				})
				.pipe(
					Effect.catchAll((error) =>
						Effect.gen(function* () {
							yield* Console.error(
								colorize(
									`\n❌ Failed to create ${CONTENT_DIRS.NEW_SRC} directory\n`,
									"RED"
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

${PATTERN.MDX_TEMPLATE.FRONTMATTER_SECTIONS.map((section) => `## ${section}`).join("\n\n")}
`;

			yield* fs.writeFileString(mdxPath, mdxContent).pipe(
				Effect.catchAll((error) =>
					Effect.gen(function* () {
						yield* Console.error(
							colorize("\n❌ Failed to create MDX file\n", "RED")
						);
						yield* Console.error(`Path: ${mdxPath}\n`);
						yield* Console.error("Check file permissions and disk space.\n");
						yield* Console.error(`Error: ${error}\n`);
						return yield* Effect.fail(new Error("Cannot create MDX file"));
					})
				)
			);
			yield* Console.log(colorize(`✓ Created: ${mdxPath}`, "GREEN"));

			// Create TypeScript file
			const tsContent = PATTERN.TS_TEMPLATE;

			yield* fs.writeFileString(tsPath, tsContent).pipe(
				Effect.catchAll((error) =>
					Effect.gen(function* () {
						yield* Console.error(
							colorize("\n❌ Failed to create TypeScript file\n", "RED")
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
			yield* Console.log(colorize(`✓ Created: ${tsPath}`, "GREEN"));

			// Display success panel with pattern details
			yield* Display.showPanel(
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
