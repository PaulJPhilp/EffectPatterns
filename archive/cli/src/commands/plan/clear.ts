import { Command, Options } from "@effect/cli";
import { Effect, Option } from "effect";
import { ConfigService } from "../../services/config-service/service.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { getGlobalJson, getGlobalCompact, getGlobalOutputOptions, printJson, printText } from "../_shared.js";

export const planClear = Command.make(
  "clear",
  { output: Options.text("output").pipe(Options.optional, Options.withAlias("o")) },
  (opts: any) =>
    Effect.gen(function* () {
      const outOpt = opts.output as Option.Option<string> | undefined;
      const globalOut = getGlobalOutputOptions()?.outputFile;
      const outputFile = outOpt && outOpt._tag === "Some" ? outOpt.value : globalOut;
      const asJson = (getGlobalJson() as boolean) || Boolean(outputFile);

      const config = yield* ConfigService;
      yield* config.remove("planRetries");
      yield* config.remove("planRetryMs");
      yield* config.remove("planFallbacks");

      if (asJson) {
        yield* printJson({ cleared: true }, getGlobalCompact(), outputFile ? { outputFile } : undefined);
      } else {
        yield* printText("Cleared execution plan overrides", outputFile ? { outputFile } : undefined);
      }
    })
);
