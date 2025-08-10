import { Command, Options } from "@effect/cli";
import { Effect, Option } from "effect";
import { RunService } from "../../services/run-service/service.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { getGlobalCompact, getGlobalJson, printJson, printText } from "../_shared.js";

export const runCurrent = Command.make(
  "current",
  {
    json: Options.boolean("json").pipe(
      Options.optional,
      Options.withDescription("Output machine-readable JSON")
    ),
    output: Options.text("output").pipe(
      Options.optional,
      Options.withAlias("o"),
      Options.withDescription("Write output to file")
    ),
  },
  ({ json, output }) =>
    Effect.gen(function* () {
      const runService = yield* RunService;
      const current = yield* runService.getCurrentRun();
      const asJson = Option.getOrElse(json, () => getGlobalJson());
      const outFile = Option.getOrElse(output, () => undefined as unknown as string | undefined);
      const outOptions = outFile ? { outputFile: outFile, force: true } : undefined;
      if (!current) {
        if (asJson) {
          yield* printJson({ current: null }, getGlobalCompact(), outOptions as any);
        } else {
          yield* printText("No active run");
        }
        return;
      }
      if (asJson) {
        yield* printJson({ current }, getGlobalCompact(), outOptions as any);
      } else {
        yield* printJson(current, false);
      }
    })
).pipe(Command.withDescription("Show the currently active run"));
