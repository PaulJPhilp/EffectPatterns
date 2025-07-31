import { Effect, Layer } from "effect";
import * as FileSystem from "@effect/platform/FileSystem";
import { NodeFileSystem } from "@effect/platform-node";

// Test FileSystem service directly with NodeFileSystem.layer like in tests
const testFileSystem = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const exists = yield* fs.exists("../test-prompt.txt");
  console.log(`File exists: ${exists}`);
  return exists;
});

// Run the test with NodeFileSystem.layer directly
Effect.runPromise(
  Effect.provide(testFileSystem, NodeFileSystem.layer)
).then(
  (result) => {
    console.log(`Test completed successfully: ${result}`);
    process.exit(0);
  },
  (error) => {
    console.error(`Test failed: ${error}`);
    process.exit(1);
  }
);
