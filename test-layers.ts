import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Path } from "@effect/platform";
import { Console, Effect } from "effect";

// Simple test program that uses Path service
const program = Effect.gen(function* () {
  const path = yield* Path.Path; // Access the Path service correctly
  yield* Console.log(`Current directory: ${path.resolve(".")}`);
  return "Success";
}).pipe(
  Effect.provide(NodeContext.layer)
);

// Run the program
NodeRuntime.runMain(program);
