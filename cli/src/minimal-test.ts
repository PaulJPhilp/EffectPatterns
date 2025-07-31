import { Command } from "@effect/cli";
import { Console, Effect } from "effect";
import { NodeContext, NodeRuntime } from "@effect/platform-node";

const testCommand = Command.make(
  "test",
  {},
  () => Effect.gen(function* () {
    yield* Console.log("Minimal test command executed successfully!");
    return "Test completed";
  })
);

const command = Command.make("minimal-cli", {}, () => Effect.void).pipe(
  Command.withSubcommands([testCommand])
);

const cli = Command.run(command, {
  name: "Minimal CLI Test",
  version: "1.0.0"
});

const mainEffect = cli(process.argv.slice(2));

mainEffect.pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain);
