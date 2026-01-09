/**
 * Pattern Scaffolding Commands
 */

import { Command, Prompt } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Console, Effect } from "effect";
import path from "node:path";
import { PROJECT_ROOT } from "../constants.js";
import { Display } from "../services/display/index.js";
import { toKebabCase } from "../utils/string.js";

/**
 * pattern:new - Scaffold a new pattern
 */
export const patternNewCommand = Command.make("new").pipe(
  Command.withDescription("Create a new pattern with interactive wizard."),
  Command.withHandler(() =>
    Effect.gen(function* () {
      yield* Console.log("\n✨ Creating a new pattern\n");
      const title = yield* Prompt.text({ message: "Pattern title:" });
      const filename = toKebabCase(title);
      
      const fs = yield* FileSystem.FileSystem;
      const mdxPath = path.join(PROJECT_ROOT, `content/new/raw/${filename}.mdx`);
      
      yield* fs.makeDirectory(path.dirname(mdxPath), { recursive: true });
      yield* fs.writeFileString(mdxPath, `---\ntitle: ${title}\n---\n`);
      
      yield* Display.showSuccess(`Created pattern scaffold at ${mdxPath}`);
    })
  )
);

/**
 * pattern - Pattern management
 */
export const patternCommand = Command.make("pattern").pipe(
  Command.withDescription("Create and manage patterns"),
  Command.withSubcommands([patternNewCommand])
);
