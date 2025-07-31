import { Effect } from "effect";
import * as FileSystem from "@effect/platform/FileSystem";
import { ProductionRuntime } from "./runtime/production-runtime.js";

// Simple test to check if FileSystem service is available
const testFileSystem = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const exists = yield* fs.exists("test-prompt.txt");
  console.log(`File exists: ${exists}`);
  return exists;
});

// Run the test
ProductionRuntime.runPromise(testFileSystem).then(
  (result) => {
    console.log(`Test completed successfully: ${result}`);
    process.exit(0);
  },
  (error) => {
    console.error(`Test failed: ${error}`);
    process.exit(1);
  }
);
