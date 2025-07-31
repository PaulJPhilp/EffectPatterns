import { Effect, Layer, ManagedRuntime } from "effect";
import * as FileSystem from "@effect/platform/FileSystem";
import { NodeFileSystem } from "@effect/platform-node";

// Simple test to verify FileSystem service access works
async function testFileSystemAccess() {
  console.log("Testing basic FileSystem service access...");

  const platformLayer = NodeFileSystem.layer;
  const runtime = ManagedRuntime.make(platformLayer);

  try {
    const testEffect = Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const exists = yield* fs.exists("./package.json");
      console.log(`✅ FileSystem service accessible, package.json exists: ${exists}`);
      return exists;
    });

    const result = await runtime.runPromise(testEffect);
    console.log("✅ Basic FileSystem test: SUCCESS");
    return true;
  } catch (error) {
    console.log(`❌ Basic FileSystem test: FAILED - ${error}`);
    return false;
  }
}

// Run the basic test
testFileSystemAccess()
  .then((success) => {
    console.log("\nBasic service test complete");
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });
