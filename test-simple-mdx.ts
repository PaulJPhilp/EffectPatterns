import { NodeFileSystem } from "@effect/platform-node";
import { Effect } from "effect";
import { MdxService } from "effect-mdx";
import * as path from "path";

const testFile = path.join(
  process.cwd(),
  "content/raw/handle-errors-with-catch.mdx"
);

const program = Effect.gen(function* () {
  console.log("Testing MdxService with new platform version...");

  const mdx = yield* MdxService;
  console.log("✅ Got MdxService");

  const result = yield* mdx.readMdxAndFrontmatter(testFile);
  console.log(`✅ Success! Title: ${result.frontmatter.title}`);
});

// Try with just NodeFileSystem.layer
const runnable = program.pipe(
  Effect.provide(MdxService.Default),
  Effect.provide(NodeFileSystem.layer)
);

Effect.runPromise(runnable).then(
  () => console.log("\n✅ Test passed!"),
  (error) => console.error("\n❌ Test failed:", error)
);
