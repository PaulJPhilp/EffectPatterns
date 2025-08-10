import { Command, Options } from "@effect/cli";
import { Effect, Option } from "effect";
import { AuthService } from "../../services/auth-service/service.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { getGlobalCompact, getGlobalJson, getGlobalOutputOptions, printJson, printText } from "../_shared.js";

export const authList = Command.make(
  "list",
  { output: Options.text("output").pipe(Options.optional, Options.withAlias("o")) },
  (opts: any) =>
    Effect.gen(function* () {
      const jsonOpt = opts.json as Option.Option<boolean> | undefined;
      const outOpt = opts.output as Option.Option<string> | undefined;
      const globalOut = getGlobalOutputOptions()?.outputFile;
      const outputFile = outOpt && outOpt._tag === "Some" ? outOpt.value : globalOut;
      const asJson = ((jsonOpt && jsonOpt._tag === "Some")
        ? jsonOpt.value
        : getGlobalJson()) || Boolean(outputFile);

      const auth = yield* AuthService;
      const providers = yield* auth.listProviders();

      if (asJson) {
        yield* printJson(
          { providers },
          getGlobalCompact(),
          outputFile ? { outputFile } : undefined
        );
      } else {
        const lines =
          providers.length === 0
            ? "No providers configured"
            : ["Configured providers:", ...providers.map((p) => `- ${p}`)].join("\n");
        yield* printText(lines, outputFile ? { outputFile } : undefined);
      }
    })
);
