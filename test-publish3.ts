import { FileSystem } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { Effect } from "effect";
import * as EffectMdx from "effect-mdx";
import * as path from "path";

const RAW_DIR = path.join(process.cwd(), "content/raw");

const testProgram = Effect.gen(function* () {
  console.log("Testing effect-mdx exports...");
  console.log("Exports:", Object.keys(EffectMdx));

  const fs = yield* FileSystem.FileSystem;

  // Get first MDX file
  const files = yield* fs.readDirectory(RAW_DIR);
  const mdxFiles = files.filter((file) => file.endsWith(".mdx"));
  console.log(`Found ${mdxFiles.length} MDX files`);

  if (mdxFiles.length === 0) {
    console.error("No MDX files found!");
    return;
  }

  const testFile = mdxFiles[0];
  console.log(`Testing with: ${testFile}`);
  const inPath = path.join(RAW_DIR, testFile);

  // Try reading file content directly
  const content = yield* fs.readFileString(inPath);
  console.log(`✅ Read file successfully (${content.length} chars)`);
});

// Define layers
const allLayers = NodeContext.layer;

// Run the program
Effect.runPromise(Effect.provide(testProgram, allLayers)).catch((error) => {
  console.error("Failed:", error);
  process.exit(1);
});
