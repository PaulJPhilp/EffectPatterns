import { NodeContext } from "@effect/platform-node";
import { Console, Effect, Layer } from "effect";
import { MdxConfigService, MdxService } from "effect-mdx";
import * as path from "path";

const RAW_DIR = path.join(process.cwd(), "content/raw");

const testProgram = Effect.gen(function* () {
  yield* Console.log("Testing MdxService integration...");

  // Try to get the service
  yield* Console.log("Attempting to get MdxService...");
  const mdxService = yield* MdxService;

  yield* Console.log("✅ MdxService obtained!");
  yield* Console.log(`Type: ${typeof mdxService}`);
  yield* Console.log(`Keys: ${Object.keys(mdxService || {}).join(", ")}`);

  if (!mdxService || !mdxService.readMdxAndFrontmatter) {
    throw new Error("MdxService doesn't have expected methods!");
  }

  // Try to read a file
  const testFile = path.join(RAW_DIR, "handle-errors-with-catch.mdx");
  yield* Console.log(`\nTrying to read: ${testFile}`);

  const result = yield* mdxService.readMdxAndFrontmatter(testFile);
  yield* Console.log(`✅ Success! Title: ${result.frontmatter.title}`);
});

// Try different layer compositions
console.log("\n=== Test 1: Simple composition ===");
const layers1 = Layer.mergeAll(
  NodeContext.layer,
  MdxConfigService.Default,
  MdxService.Default
);

Effect.runPromise(Effect.provide(testProgram, layers1))
  .then(() => console.log("\n✅ Test 1 passed!"))
  .catch((error) => {
    console.error("\n❌ Test 1 failed:", error);

    // Try alternative
    console.log("\n=== Test 2: Sequential provision ===");
    const layers2 = MdxService.Default.pipe(
      Layer.provide(MdxConfigService.Default),
      Layer.provide(NodeContext.layer)
    );

    Effect.runPromise(Effect.provide(testProgram, layers2))
      .then(() => console.log("\n✅ Test 2 passed!"))
      .catch((err) => {
        console.error("\n❌ Test 2 failed:", err);
        process.exit(1);
      });
  });
