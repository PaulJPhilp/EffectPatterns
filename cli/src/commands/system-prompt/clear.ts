import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import { ConfigService } from "../../services/config-service/service.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { makeCommand, printText, getGlobalOutputOptions } from "../_shared.js";

export const systemPromptClear = makeCommand(
  "clear",
  {
    output: Options.text("output").pipe(
      Options.optional,
      Options.withAlias("o")
    ),
  },
  ({ output }) =>
    Effect.gen(function* () {
      const outOpt = output as any;
      const localOut = outOpt && outOpt._tag === "Some" ? outOpt.value : undefined;
      const config = yield* ConfigService;
      yield* config.clearSystemPromptFile();
      const globalOut = getGlobalOutputOptions()?.outputFile;
      const outputFile = localOut ?? globalOut;
      yield* printText(
        "System prompt cleared",
        outputFile ? { outputFile } : undefined
      );
    }),
  {
    description: "Clear the global system prompt file",
    errorPrefix: "Error clearing system prompt",
  }
);
