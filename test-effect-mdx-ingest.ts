/**
 * test-effect-mdx-ingest.ts
 *
 * Test script to verify effect-mdx works with the new folder structure
 */

import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { Console, Effect, Layer } from "effect";
import { MdxService, defaultMdxConfigLayer } from "effect-mdx";

// --- Configuration Service ---
class AppConfig extends Effect.Service<AppConfig>()("AppConfig", {
  sync: () => ({
    rawDir: process.cwd() + "/content/new/raw",
    srcDir: process.cwd() + "/content/new/src",
    processedDir: process.cwd() + "/content/new/processed",
  }),
}) {}

// --- Test: Read one MDX file ---
const testReadMdx = Effect.gen(function* () {
  const config = yield* AppConfig;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const mdx = yield* MdxService;

  yield* Console.log("🧪 Testing effect-mdx with new folder structure...");
  yield* Console.log(`📂 Reading from: ${config.rawDir}`);

  // Get all MDX files
  const files = yield* fs.readDirectory(config.rawDir);
  const mdxFiles = files.filter((f) => f.endsWith(".mdx"));

  yield* Console.log(`📄 Found ${mdxFiles.length} MDX files`);

  if (mdxFiles.length === 0) {
    yield* Console.log("⚠️  No MDX files found to test");
    return;
  }

  // Test reading the first file
  const testFile = mdxFiles[0];
  const filePath = path.join(config.rawDir, testFile);

  yield* Console.log(`\n📖 Testing with: ${testFile}`);

  try {
    const { content, frontmatter } = yield* mdx.readMdxAndFrontmatter(filePath);

    yield* Console.log("\n✅ Successfully read MDX file!");
    yield* Console.log(`   ID: ${frontmatter.id}`);
    yield* Console.log(`   Title: ${frontmatter.title}`);
    yield* Console.log(`   Content length: ${content.length} characters`);

    // Test extracting TypeScript code
    const codeBlockRegex = /```typescript\n([\s\S]*?)\n```/;
    const matches = content.match(codeBlockRegex);

    if (matches) {
      yield* Console.log(
        `   ✅ Found TypeScript code block (${matches[1].length} characters)`
      );
    } else {
      yield* Console.log(`   ⚠️  No TypeScript code block found`);
    }
  } catch (error) {
    yield* Console.error(`❌ Error reading MDX: ${String(error)}`);
  }
});

// --- Run the Program ---
// Provide layers: MdxService needs FileSystem and MdxConfigService
const mdxDeps = Layer.mergeAll(NodeContext.layer, defaultMdxConfigLayer);
const mdxLayer = Layer.provide(MdxService.Default, mdxDeps);
const fullLayer = Layer.mergeAll(
  AppConfig.Default,
  mdxLayer,
  NodeContext.layer
);

const runnable = testReadMdx.pipe(Effect.provide(fullLayer));

// Use runPromise to wait for completion
Effect.runPromise(runnable).then(
  () => {
    console.log("\n✨ Test completed successfully!");
    process.exit(0);
  },
  (error) => {
    console.error("\n💥 Test failed:", error);
    process.exit(1);
  }
);
