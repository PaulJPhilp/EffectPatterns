import { FileSystem } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { MdxConfigService, MdxService } from "effect-mdx";
import * as path from "path";

const RAW_DIR = path.join(process.cwd(), "content/raw");

const testProgram = Effect.gen(function* () {
  console.log("Testing MdxService...");

  const fs = yield* FileSystem.FileSystem;
  const mdxService = yield* MdxService;

  console.log("✅ Services obtained successfully");

  // Get first MDX file
  const files = yield* fs.readDirectory(RAW_DIR);
  const mdxFiles = files.filter((file) => file.endsWith(".mdx"));
  console.log(`Found ${mdxFiles.length} MDX files`);

  const testFile = "handle-errors-with-catch.mdx";
  console.log(`Testing with: ${testFile}`);

  const inPath = path.join(RAW_DIR, testFile);

  try {
    console.log("Calling readMdxAndFrontmatter...");
    const result = yield* mdxService.readMdxAndFrontmatter(inPath);
    console.log("✅ Successfully read MDX file");
    console.log("Frontmatter title:", result.frontmatter.title);
    console.log("Content length:", result.content.length);
    console.log("Body length:", result.mdxBody.length);
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
});

// Define layers with both MdxConfigService and MdxService
const allLayers = Layer.mergeAll(
  NodeContext.layer,
  MdxConfigService.Default,
  MdxService.Default
);

// Run the program
Effect.runPromise(Effect.provide(testProgram, allLayers)).catch((error) => {
  console.error("Failed:", error);
  process.exit(1);
});
