#!/usr/bin/env node

/**
 * Supermemory CLI - Main Entry Point
 */

import { Effect, Layer } from 'effect';
import { Command } from '@effect/cli';
import { NodeContext, NodeRuntime } from '@effect/platform-node';
import { ConfigServiceLive } from './services/config.js';
import { projectCommand } from './commands/project.js';
import { memoriesCommand, documentsCommand } from './commands/memories.js';
import { patternsCommand } from './commands/patterns.js';
import { queueCommand } from './commands/queue.js';
import { profilesCommand } from './commands/profiles.js';

/**
 * Main CLI application
 */
const mainCommand = Command.make(
  'sm-cli',
  {},
  () => Effect.void,
).pipe(
  Command.withDescription('Supermemory CLI for managing Effect Patterns'),
  Command.withSubcommands([
    projectCommand,
    memoriesCommand,
    documentsCommand,
    patternsCommand,
    queueCommand,
    profilesCommand,
  ]),
);

/**
 * Run the CLI
 */
const cli = Command.run(mainCommand, {
  name: 'sm-cli',
  version: '0.1.0',
});

cli(process.argv).pipe(
  Effect.provide(Layer.mergeAll(ConfigServiceLive, NodeContext.layer)),
  NodeRuntime.runMain as any,
);
