import { Args, Command, Options } from "@effect/cli";
import { Effect, Option } from "effect";
import { ConfigService } from "../../services/config-service/service.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { getGlobalCompact, getGlobalJson, printJson, printText } from "../_shared.js";

export const configSet = Command.make(
  "set",
  {
    key: Args.text({ name: "key" }),
    value: Args.text({ name: "value" }),
    output: Options.text("output").pipe(Options.optional, Options.withAlias("o")),
  },
  (opts: any) =>
    Effect.gen(function* () {
      const key = opts.key as string;
      const value = opts.value as string;
      const jsonOpt = opts.json as Option.Option<boolean> | undefined;
      const outOpt = opts.output as Option.Option<string> | undefined;
      const asJson = ((jsonOpt && jsonOpt._tag === "Some")
        ? jsonOpt.value
        : getGlobalJson()) || Boolean(outOpt && outOpt._tag === "Some");
      const outputFile = outOpt && outOpt._tag === "Some" ? outOpt.value : undefined;

      const config = yield* ConfigService;
      yield* config.set(key, value);
      if (asJson) {
        yield* printJson(
          { set: { key, value } },
          getGlobalCompact(),
          outputFile ? { outputFile } : undefined
        );
      } else {
        yield* printText(
          `Set ${key}=${value}`,
          outputFile ? { outputFile } : undefined
        );
      }
    })
);
