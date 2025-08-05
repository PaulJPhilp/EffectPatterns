import { Command, Args, Options } from "@effect/cli";
import { Console, Effect } from "effect";

// Echo command for debugging CLI argument parsing
const fileArg = Args.text({ name: "file" });
const providerOption = Options.text("provider").pipe(
  Options.withDefault("google"),
  Options.withDescription("LLM provider to use (google, openai, anthropic)")
);
const modelOption = Options.text("model").pipe(
  Options.withDefault("gemini-2.5-flash"),
  Options.withDescription("Model to use with the selected provider")
);
const outputOption = Options.text("output").pipe(
  Options.optional,
  Options.withDescription("Save AI response to file instead of console")
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
      yield* Console.log("=== ECHO COMMAND DEBUG ===");
      yield* Console.log(`File: ${file}`);
      yield* Console.log(`Provider: ${provider}`);
      yield* Console.log(`Model: ${model}`);
      yield* Console.log(`Output: ${output || "console"}`);
      yield* Console.log("=== END ECHO DEBUG ===");
    })
);
