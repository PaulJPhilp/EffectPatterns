#!/usr/bin/env bun

import { Command } from "@effect/cli";
import { systemPromptCommand } from "./src/commands/system-prompt.js";
import { ProductionRuntime } from "./src/runtime/production-runtime.js";

// Run the system-prompt command
const main = Command.run(systemPromptCommand, {
  name: "system-prompt-test",
  version: "1.0.0"
});

const program = main(process.argv.slice(2));

// Run with production runtime
ProductionRuntime.runPromise(program).catch((error) => {
  // For help commands, we still want to show the help output
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    // Help was requested, so the error is expected
    process.exit(0);
  } else {
    console.error('Command failed:', error);
    process.exit(1);
  }
});
