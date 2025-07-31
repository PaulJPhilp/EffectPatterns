import { Console, Effect } from "effect";
import { NodeRuntime } from "@effect/platform-node";

const testEffect = Effect.gen(function* () {
  yield* Console.log("Direct console test executed successfully!");
  return "Test completed";
});

testEffect.pipe(NodeRuntime.runMain);
