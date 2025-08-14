import { Command } from "@effect/cli";
import { Effect } from "effect";
export const testCommand = Command.make("test", {}, () => {
    return Effect.gen(function* () {
        yield* Effect.log("Test command executed successfully!");
        return "Test completed";
    });
});
//# sourceMappingURL=test.js.map