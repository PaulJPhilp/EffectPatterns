/**
 * Release Commands
 */

import { Command, Prompt } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Console, Effect } from "effect";
import path from "node:path";
import { PROJECT_ROOT } from "../constants.js";
import { execGitCommand } from "../utils/git.js";
import { analyzeRelease } from "../utils/release.js";
import { colorize } from "../utils.js";

/**
 * release:preview - Preview the next release
 */
export const releasePreviewCommand = Command.make("preview").pipe(
  Command.withDescription("Analyze commits and preview the next release version."),
  Command.withHandler(() =>
    Effect.gen(function* () {
      yield* Console.log("\n🔍 Analyzing commits for release preview...\n");
      const analysis = yield* analyzeRelease();

      if (!analysis.hasChanges) {
        yield* Console.log(colorize("\n⚠️  No commits found since last release\n", "YELLOW"));
        return;
      }

      yield* Console.log(`📌 Current version: ${analysis.currentVersion}`);
      yield* Console.log(`🎯 Next Version: ${analysis.nextVersion}\n`);
      yield* Console.log("━".repeat(60));
      yield* Console.log("📝 DRAFT CHANGELOG");
      yield* Console.log("━".repeat(60));
      yield* Console.log(analysis.changelog);
      yield* Console.log("━".repeat(60));
    })
  )
);

/**
 * release:create - Create a new release
 */
export const releaseCreateCommand = Command.make("create").pipe(
  Command.withDescription("Create a new release with version bump and changelog."),
  Command.withHandler(() =>
    Effect.gen(function* () {
      yield* Console.log("\n🚀 Creating new release...\n");
      const analysis = yield* analyzeRelease();

      if (!analysis.hasChanges) return;

      const confirmed = yield* Prompt.confirm({
        message: `Proceed with release to v${analysis.nextVersion}?`,
        initial: false,
      });

      if (!confirmed) return;

      const fs = yield* FileSystem.FileSystem;
      
      // Update package.json
      const pkgPath = path.join(PROJECT_ROOT, "package.json");
      const pkg = JSON.parse(yield* fs.readFileString(pkgPath));
      pkg.version = analysis.nextVersion;
      yield* fs.writeFileString(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

      // Update CHANGELOG.md (simplified)
      yield* fs.writeFileString(path.join(PROJECT_ROOT, "CHANGELOG.md"), analysis.changelog);

      yield* execGitCommand("add", ["package.json", "CHANGELOG.md"]);
      yield* execGitCommand("commit", ["-m", `chore(release): v${analysis.nextVersion}`]);
      yield* execGitCommand("tag", [`v${analysis.nextVersion}`]);
      yield* execGitCommand("push", ["--follow-tags"]);

      yield* Console.log(colorize(`\n✨ Release v${analysis.nextVersion} completed!`, "GREEN"));
    })
  )
);

/**
 * release - Release management
 */
export const releaseCommand = Command.make("release").pipe(
  Command.withDescription("Manage project releases"),
  Command.withSubcommands([releasePreviewCommand, releaseCreateCommand])
);
