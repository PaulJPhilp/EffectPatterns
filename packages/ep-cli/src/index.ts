#!/usr/bin/env bun

import { Effect } from "effect";
import { EffectCLIRuntime } from "effect-cli-tui";

import { createUserProgram, runtimeLayerWithTUI } from "../../cli/src/index.js";

const program = createUserProgram(process.argv).pipe(
  Effect.provide(runtimeLayerWithTUI as any)
) as any;

await EffectCLIRuntime.runPromise(program);
await EffectCLIRuntime.dispose();
