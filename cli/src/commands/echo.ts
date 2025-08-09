import { Args, Command, Options } from "@effect/cli";
import { Console, Effect, Option } from "effect";
import { ConfigService } from "../services/config-service/service.js";

// Echo command for debugging CLI argument parsing
const fileArg = Args.text({ name: "file" });
const providerOption = Options.optional(
  Options.choice("provider", ["openai", "anthropic", "google"]).pipe(
    Options.withDescription("LLM provider to use (google, openai, anthropic)"),
    Options.withAlias("p")
  )
);
const modelOption = Options.optional(
  Options.text("model").pipe(
    Options.withDescription("Model to use with the selected provider"),
    Options.withAlias("m")
  )
);
const outputOption = Options.text("output").pipe(
  Options.optional,
  Options.withDescription("Save AI response to file instead of console"),
  Options.withAlias("o")
);

export const echoCommand = Command.make(
  "echo",
  {
    file: fileArg,
    provider: providerOption,
    model: modelOption,
    output: outputOption,
  },
  ({ file, provider, model, output }) =>
    Effect.gen(function* () {
      const config = yield* ConfigService;
      const providerFromConfig = yield* config.get("defaultProvider");
      const modelFromConfig = yield* config.get("defaultModel");
      const resolvedProvider = Option.getOrElse(provider, () =>
        Option.getOrElse(
          providerFromConfig as Option.Option<
            "openai" | "anthropic" | "google"
          >,
          () => "google"
        )
      );
      const resolvedModel = Option.getOrElse(model, () =>
        Option.getOrElse(
          modelFromConfig as Option.Option<string>,
          () => "gemini-2.5-flash"
        )
      );

      yield* Console.log("=== ECHO COMMAND DEBUG ===");
      yield* Console.log(`File: ${file}`);
      yield* Console.log(`Provider: ${resolvedProvider}`);
      yield* Console.log(`Model: ${resolvedModel}`);
      yield* Console.log(`Output: ${output || "console"}`);
      yield* Console.log("=== END ECHO DEBUG ===");
    })
);
