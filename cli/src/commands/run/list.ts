import { Command, Options } from "@effect/cli";
import { Effect, Option } from "effect";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { listRunNames } from "./utils.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { getGlobalCompact, getGlobalJson, printJson, printText } from "../_shared.js";

export const runList = Command.make(
  "list",
  {
    json: Options.boolean("json").pipe(
      Options.optional,
      Options.withDescription("Output machine-readable JSON array")
    ),
    output: Options.text("output").pipe(
      Options.optional,
      Options.withAlias("o"),
      Options.withDescription("Write output to file")
    ),
  },
  ({ json, output }) =>
    Effect.gen(function* () {
      const entries = yield* listRunNames;
      const asJson = Option.getOrElse(json, () => getGlobalJson());
      const outFile = Option.getOrElse(output, () => undefined as unknown as string | undefined);
      const outOptions = outFile ? { outputFile: outFile, force: true } : undefined;
      if (entries.length === 0) {
        if (asJson) {
          yield* printJson({ runs: [] }, getGlobalCompact(), outOptions as any);
        } else {
          yield* printText("No runs found");
        }
        return;
      }
      if (asJson) {
        yield* printJson({ runs: entries }, getGlobalCompact(), outOptions as any);
        return;
      }
      for (const name of entries) {
        yield* printText(name);
      }
    })
).pipe(Command.withDescription("List available runs"));
