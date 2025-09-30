import { FileSystem } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { Console, Effect, Layer } from "effect";
import { MdxConfigService, MdxService } from "effect-mdx";
import * as path from "path";

const RAW_DIR = path.join(process.cwd(), "content/raw");

const testProgram = Effect.gen(function* () {
  yield* Console.log("Testing MdxService...");

  const fs = yield* FileSystem.FileSystem;
  yield* Console.log("✅ FileSystem obtained");

  const mdxService = yield* MdxService;
  yield* Console.log("✅ MdxService obtained");
  yield* Console.log(`Service type: ${typeof mdxService}`);
  yield* Console.log(
    `Service keys: ${Object.keys(mdxService || {}).join(", ")}`
  );

  if (!mdxService) {
    throw new Error("MdxService is undefined!");
  }

  if (!mdxService.readMdxAndFrontmatter) {
    throw new Error("readMdxAndFrontmatter method not found!");
  }

  yield* Console.log(
    `readMdxAndFrontmatter type: ${typeof mdxService.readMdxAndFrontmatter}`
  );

  // Get first MDX file
  const files = yield* fs.readDirectory(RAW_DIR);
  const mdxFiles = files.filter((file) => file.endsWith(".mdx"));
  yield* Console.log(`Found ${mdxFiles.length} MDX files`);

  const testFile = "handle-errors-with-catch.mdx";
  const inPath = path.join(RAW_DIR, testFile);

  yield* Console.log(`Calling readMdxAndFrontmatter with: ${inPath}`);
  const effectResult = mdxService.readMdxAndFrontmatter(inPath);
  yield* Console.log(`Effect result type: ${typeof effectResult}`);

  const result = yield* effectResult;
  yield* Console.log("✅ Successfully read MDX file");
  yield* Console.log(`Title: ${result.frontmatter.title}`);
});

// Define layers
const allLayers = Layer.mergeAll(
  NodeContext.layer,
  MdxConfigService.Default,
  MdxService.Default
);

// Run the program
Effect.runPromise(Effect.provide(testProgram, allLayers)).catch((error) => {
  console.error("Failed:", error);
  console.error("Stack:", error.stack);
  process.exit(1);
});
