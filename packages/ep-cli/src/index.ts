#!/usr/bin/env bun

/**
 * ep.ts
 *
 * A unified project management CLI for EffectPatterns.
 */

import { StateStore } from "@effect-patterns/pipeline-state";
import { Command } from "@effect/cli";
import { FetchHttpClient } from "@effect/platform";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Effect, Layer } from "effect";

// Commands
import { adminCommand } from "./commands/admin-commands.js";
import { installCommand } from "./commands/install-commands.js";
import { patternCommand } from "./commands/pattern-commands.js";
import { listCommand, searchCommand, showCommand } from "./commands/pattern-repo-commands.js";
import { releaseCommand } from "./commands/release-commands.js";

// Services
import { Display } from "./services/display/index.js";
import { Execution } from "./services/execution/index.js";
import { Linter } from "./services/linter/index.js";
import { LiveTUILoader } from "./services/tui-loader.js";

/**
 * Unified Root Command
 */
export const rootCommand = Command.make("ep").pipe(
  Command.withDescription("A CLI for Effect Patterns Hub"),
  Command.withSubcommands([
    searchCommand,
    listCommand,
    showCommand,
    patternCommand,
    installCommand,
    releaseCommand,
    adminCommand,
  ])
);

// Layers
export const LiveDisplay = Layer.provide(Display.Default, LiveTUILoader);
export const LiveExecution = Layer.provide(Execution.Default, LiveTUILoader);

export const runtimeLayer = Layer.mergeAll(
  NodeContext.layer,
  FetchHttpClient.layer,
  (StateStore as any).Default,
  LiveDisplay,
  LiveExecution,
  Linter.Default
);

const cliRunner = Command.run(rootCommand, {
  name: "EffectPatterns CLI",
  version: "0.5.0",
});

export const createProgram = (argv: ReadonlyArray<string> = process.argv) =>
  cliRunner(argv);

// Run the program
createProgram(process.argv).pipe(
  Effect.provide(runtimeLayer as any),
  Effect.catchAllCause((cause) => Effect.sync(() => console.error(cause))),
  NodeRuntime.runMain as any
);
