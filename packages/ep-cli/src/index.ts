#!/usr/bin/env bun

import { Effect } from "effect";
import { EffectCLIRuntime } from "effect-cli-tui";

import { createUserProgram, runtimeLayer } from "@effect-patterns/cli-core";

const program = createUserProgram(process.argv).pipe(
  Effect.provide(runtimeLayer)
);

await EffectCLIRuntime.runPromise(program);
await EffectCLIRuntime.dispose();
