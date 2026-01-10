#!/usr/bin/env bun

/**
 * ep.ts
 *
 * A unified project management CLI for EffectPatterns.
 */

import { StateStore } from "@effect-patterns/pipeline-state";
import { Command } from "@effect/cli";
import { FetchHttpClient } from "@effect/platform";
import { NodeContext, NodeFileSystem, NodeRuntime } from "@effect/platform-node";
import { Effect, Layer } from "effect";

import { CLI } from "./constants.js";

// Commands
import { adminCommand } from "./commands/admin-commands.js";
import { installCommand } from "./commands/install-commands.js";
import { patternCommand } from "./commands/pattern-commands.js";
import { listCommand, searchCommand, showCommand } from "./commands/pattern-repo-commands.js";
import { releaseCommand } from "./commands/release-commands.js";
import { skillsCommand } from "./commands/skills-commands.js";

// Services
import { Display } from "./services/display/index.js";
import { LiveTUILoader, TUILoader } from "./services/display/tui-loader.js";
import { Execution } from "./services/execution/index.js";
import { Linter } from "./services/linter/index.js";
import { Logger } from "./services/logger/index.js";
import { Skills } from "./services/skills/index.js";

/**
 * Unified Root Command
 */
export const rootCommand = Command.make("ep").pipe(
  Command.withDescription(CLI.DESCRIPTION),
  Command.withSubcommands([
    searchCommand,
    listCommand,
    showCommand,
    patternCommand,
    installCommand,
    releaseCommand,
    adminCommand,
    skillsCommand,
  ])
);

// Layers
/**
 * Core runtime layer (Standard CLI)
 */
export const runtimeLayer = Layer.mergeAll(
  NodeContext.layer,
  NodeFileSystem.layer,
  FetchHttpClient.layer,
  Logger.Default,
  LiveTUILoader,
  (StateStore as any).Default as Layer.Layer<StateStore>
).pipe(
  Layer.provideMerge(Linter.Default),
  Layer.provideMerge(Skills.Default),
  Layer.provideMerge(Display.Default),
  Layer.provideMerge(Execution.Default)
);

/**
 * Runtime layer with TUI support
 */
export const runtimeLayerWithTUI = Effect.gen(function*() {
  const tuiLoader = yield* TUILoader;
  const tui = yield* tuiLoader.load();
  
  if (tui?.runtimeLayer) {
    return runtimeLayer.pipe(Layer.provide(tui.runtimeLayer));
  }
  
  return runtimeLayer;
});

const cliRunner = Command.run(rootCommand, {
  name: CLI.RUNNER_NAME,
  version: CLI.VERSION,
});

export const createProgram = (argv: ReadonlyArray<string> = process.argv) =>
  cliRunner(argv);

// Run the program
const program = createProgram(process.argv);
const provided = program.pipe(
  Effect.provide(runtimeLayer),
  Effect.catchAllCause((cause) => 
    Effect.gen(function*() {
      const logger = yield* Logger;
      yield* logger.error("Fatal Error", { cause });
    }).pipe(Effect.provide(runtimeLayer))
  )
) as unknown as Effect.Effect<void, unknown, never>;

void NodeRuntime.runMain(provided);
