import { Effect, Layer, ManagedRuntime } from "effect";
import * as FileSystem from "@effect/platform/FileSystem";
import { NodeContext, NodeHttpClient, NodeFileSystem } from "@effect/platform-node";

// Create a minimal runtime with just platform services
const MinimalPlatformRuntime = ManagedRuntime.make(
  Layer.mergeAll(
    NodeContext.layer,
    NodeHttpClient.layer,
    NodeFileSystem.layer
  )
);

// Simulate the process-prompt command's FileSystem access
const testProcessPrompt = Effect.gen(function* () {
  console.log("Testing process-prompt FileSystem access...");
  
  // This is the same pattern as in process-prompt command line 91-93
  const fs = yield* FileSystem.FileSystem;
  const prompt = yield* fs.readFileString("../test-prompt.txt");
  
  console.log(`Read prompt: ${prompt}`);
  return prompt;
});

// Run the test
MinimalPlatformRuntime.runPromise(testProcessPrompt).then(
  (result) => {
    console.log(`Process-prompt test completed successfully`);
    process.exit(0);
  },
  (error) => {
    console.error(`Process-prompt test failed: ${error}`);
    process.exit(1);
  }
);
