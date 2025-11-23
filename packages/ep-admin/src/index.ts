#!/usr/bin/env bun

import { Effect } from 'effect';
import { EffectCLIRuntime } from 'effect-cli-tui';

import {
	createAdminProgram,
	runtimeLayer,
} from '@effect-patterns/cli-core';

const program = createAdminProgram(process.argv).pipe(
	Effect.provide(runtimeLayer),
);

await EffectCLIRuntime.runPromise(program);
await EffectCLIRuntime.dispose();
