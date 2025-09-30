import { FileSystem } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { MdxConfigService } from "effect-mdx/config";
import { MdxService } from "effect-mdx/service";
import * as path from "path";

const RAW_DIR = path.join(process.cwd(), "content/raw");

const testProgram = Effect.gen(function* () {
  console.log("Testing MdxService with Config...");

  const fs = yield* FileSystem.FileSystem;
  const mdxService = yield* MdxService;

  console.log("✅ Services obtained successfully");
  console.log("MdxService type:", typeof mdxService);
  console.log("MdxService keys:", Object.keys(mdxService));

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

  try {
    console.log("Calling readMdxAndFrontmatter...");
    const result = yield* mdxService.readMdxAndFrontmatter(inPath);
    console.log("✅ Successfully read MDX file");
    console.log("Frontmatter:", result.frontmatter);
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
});

// Define layers - include both services
const allLayers = Layer.mergeAll(
  NodeContext.layer,
  Layer.provide(MdxConfigService.Default, NodeContext.layer),
  Layer.provide(
    MdxService.Default,
    Layer.mergeAll(NodeContext.layer, MdxConfigService.Default)
  )
);

// Run the program
Effect.runPromise(Effect.provide(testProgram, allLayers)).catch((error) => {
  console.error("Failed:", error);
  process.exit(1);
});
