import { Effect } from "effect";
import { runTestEffect } from "../runtime/testing-runtime.js";
// Helper function to run CLI commands with the managed runtime
export const runTestCli = (command) => {
    return runTestEffect(Effect.succeed(command));
};
export { runTestEffect };
