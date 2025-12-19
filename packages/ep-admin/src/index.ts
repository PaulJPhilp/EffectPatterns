#!/usr/bin/env bun

import { Effect } from "effect";
import { EffectCLIRuntime } from "effect-cli-tui";

import { createAdminProgram, runtimeLayerWithTUI } from "../../cli/src/index.js";

const program = createAdminProgram(process.argv).pipe(
  Effect.provide(runtimeLayerWithTUI)
);

await EffectCLIRuntime.runPromise(program);
await EffectCLIRuntime.dispose();
