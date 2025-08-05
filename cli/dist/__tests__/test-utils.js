import { Effect } from "effect";
import { runTestEffect } from "../runtime/testing-runtime.js";
// Export the managed runtime helpers
export { runTestEffect, runTestExit } from "../runtime/testing-runtime.js";
// Helper function to run CLI commands with the managed runtime
export const runTestCli = (command) => {
    return runTestEffect(Effect.succeed(command));
};
