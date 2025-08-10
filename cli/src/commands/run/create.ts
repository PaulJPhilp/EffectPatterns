import { Command, Options } from "@effect/cli";
import { Effect, Option } from "effect";
import { RunService } from "../../services/run-service/service.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { optQuiet } from "../_shared.js";

export const runCreate = Command.make(
  "create",
  {
    prefix: Options.text("prefix").pipe(
      Options.optional,
      Options.withAlias("p"),
      Options.withDescription("Custom name prefix for the run")
    ),
    quiet: optQuiet("Suppress output (only create the run)"),
  },
  ({ prefix, quiet }) =>
    Effect.gen(function* () {
      const runService = yield* RunService;
      const isQuiet = Option.getOrElse(quiet, () => false);
      const pref = Option.getOrElse(prefix, () => undefined);
      const info = yield* runService.createRunDirectory(pref);
      if (!isQuiet) {
        yield* Effect.log(`Run created: ${info.runName}`);
        yield* Effect.log(`Directory: ${info.runDirectory}`);
      }
    })
).pipe(Command.withDescription("Create a new run directory"));
