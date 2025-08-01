import { Command, Args, Options } from "@effect/cli";
import { Console, Effect, Layer, Option as EffectOption, Redacted, Config } from "effect";

// Model list command
const modelList = Command.make(
  "list",
  {
    provider: Options.choice("provider", ["openai", "anthropic", "google"]).pipe(
      Options.optional,
      Options.withDescription("Filter models by provider")
    )
  },
  ({ provider }) =>
    Effect.gen(function* () {
      const providerValue = EffectOption.match(provider, {
        onNone: () => null,
        onSome: (p) => p
      });
      
      yield* Console.log(`Listing models${providerValue ? ` for ${providerValue}` : ""}...`);
      
      if (!providerValue || providerValue === "openai") {
        yield* listOpenAIModels();
      }
      
      if (!providerValue || providerValue === "anthropic") {
        yield* listAnthropicModels();
      }
      
      if (!providerValue || providerValue === "google") {
        yield* listGoogleModels();
      }
    })
);

// Model info command
const modelInfo = Command.make(
  "info",
  {
    provider: Args.choice([
      ["openai", "openai"],
      ["anthropic", "anthropic"],
      ["google", "google"]
    ], { name: "provider" }),
    model: Args.text({ name: "model" })
  },
  ({ provider, model }) =>
    Effect.gen(function* () {
      yield* Console.log(`Getting info for ${provider} model: ${model}...`);
      
      switch (provider) {
        case "openai":
          yield* getOpenAIModelInfo(model);
          break;
        case "anthropic":
          yield* getAnthropicModelInfo(model);
          break;
        case "google":
          yield* getGoogleModelInfo(model);
          break;
      }
    })
);

const listOpenAIModels = () =>
  Effect.gen(function* () {
    const apiKeyOption = yield* Effect.either(Config.redacted("OPENAI_API_KEY"));
    
    if (apiKeyOption._tag === "Left") {
      yield* Console.log("OpenAI: No API key configured");
      return;
    }
    
    const apiKey = apiKeyOption.right;
    
    // TODO: Implement actual model listing
    yield* Console.log("OpenAI models: gpt-4, gpt-4o, gpt-4o-mini, gpt-3.5-turbo");
  });

const getOpenAIModelInfo = (model: string) =>
  Effect.gen(function* () {
    // TODO: Implement actual model info fetching
    yield* Console.log(`OpenAI ${model}: A powerful language model`);
  });

// Helper functions for Anthropic
const listAnthropicModels = () =>
  Effect.gen(function* () {
    const apiKeyOption = yield* Effect.either(Config.redacted("ANTHROPIC_API_KEY"));
    
    if (apiKeyOption._tag === "Left") {
      yield* Console.log("Anthropic: No API key configured");
      return;
    }
    
    const apiKey = apiKeyOption.right;
    yield* Console.log("Anthropic models: claude-3-5-sonnet, claude-3-opus, claude-3-haiku");
  });

const getAnthropicModelInfo = (model: string) =>
  Effect.gen(function* () {
    // TODO: Implement actual model info fetching
    yield* Console.log(`Anthropic ${model}: An advanced AI assistant`);
  });

// Helper functions for Google
const listGoogleModels = () =>
  Effect.gen(function* () {
    const apiKeyOption = yield* Effect.either(Config.redacted("GOOGLE_AI_API_KEY"));
    
    if (apiKeyOption._tag === "Left") {
      yield* Console.log("Google: No API key configured");
      return;
    }
    
    const apiKey = apiKeyOption.right;
    
    // TODO: Implement actual model listing
    yield* Console.log("Google models: gemini-pro, gemini-pro-vision");
  });

const getGoogleModelInfo = (model: string) =>
  Effect.gen(function* () {
    // TODO: Implement actual model info fetching
    yield* Console.log(`Google ${model}: A versatile multimodal model`);
  });

// Export the model command with subcommands
export const modelCommand = Command.make("model").pipe(
  Command.withSubcommands([modelList, modelInfo])
);