import { Effect, Layer, ManagedRuntime } from "effect";
import * as FileSystem from "@effect/platform/FileSystem";
import { NodeContext, NodeHttpClient, NodeFileSystem } from "@effect/platform-node";
import { ConfigProvider } from "effect";

// Test 1: Just platform services
const PlatformLayer = Layer.mergeAll(
  NodeContext.layer,
  NodeHttpClient.layer,
  NodeFileSystem.layer
);

const PlatformRuntime = ManagedRuntime.make(PlatformLayer);

// Test FileSystem service with platform runtime
const testFileSystem = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const exists = yield* fs.exists("../test-prompt.txt");
  console.log(`File exists: ${exists}`);
  return exists;
});

console.log("Testing platform runtime...");
PlatformRuntime.runPromise(testFileSystem).then(
  (result) => {
    console.log(`Platform runtime test completed successfully: ${result}`);
    process.exit(0);
  },
  (error) => {
    console.error(`Platform runtime test failed: ${error}`);
    process.exit(1);
  }
);
