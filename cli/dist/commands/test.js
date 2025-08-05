import { Command } from "@effect/cli";
import { Console, Effect } from "effect";
export const testCommand = Command.make("test", {}, () => {
    return Effect.gen(function* () {
        yield* Console.log("Test command executed successfully!");
        return "Test completed";
    });
});
