import { Console, Effect } from "effect";
import * as FileSystem from "@effect/platform/FileSystem";
import { ProductionRuntime } from "./runtime/production-runtime.js";

const testEffect = Effect.gen(function* () {
  yield* Console.log("Testing runtime...");
  const fs = yield* FileSystem.FileSystem;
  yield* Console.log("FileSystem service acquired");
  
  try {
    const entries = yield* fs.readDirectory("content/published");
    yield* Console.log(`Found ${entries.length} entries`);
  } catch (error) {
    yield* Console.error(`Error: ${error}`);
  }
  
  yield* Console.log("Test completed");
});

ProductionRuntime.runPromise(testEffect).then(
  () => {
    console.log("Test effect completed successfully");
    process.exit(0);
  },
  (error) => {
    console.error(`Test effect failed: ${error}`);
    process.exit(1);
  }
);
