import { Effect, Layer, ManagedRuntime } from "effect";
import * as FileSystem from "@effect/platform/FileSystem";
import { NodeFileSystem } from "@effect/platform-node";

// Create a minimal runtime with just NodeFileSystem.layer
const MinimalRuntime = ManagedRuntime.make(NodeFileSystem.layer);

// Test FileSystem service with minimal runtime
const testFileSystem = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const exists = yield* fs.exists("../test-prompt.txt");
  console.log(`File exists: ${exists}`);
  return exists;
});

// Run the test
MinimalRuntime.runPromise(testFileSystem).then(
  (result) => {
    console.log(`Test completed successfully: ${result}`);
    process.exit(0);
  },
  (error) => {
    console.error(`Test failed: ${error}`);
    process.exit(1);
  }
);
