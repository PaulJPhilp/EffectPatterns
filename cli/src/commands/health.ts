import { Command, Options } from "@effect/cli";
import { Config, Console, Effect, Option as EffectOption, Layer } from "effect";
import { CONFIG_KEYS } from "../config/constants.js";
import { LLMService } from "../services/llm-service/service.js";
import { AnthropicClient } from "@effect/ai-anthropic";
import { GoogleAiClient } from "@effect/ai-google";
import { OpenAiClient } from "@effect/ai-openai";

// Health check command
const createAiClientLayers = () => {
  const anthropicLayer = Layer.effect(
    AnthropicClient.AnthropicClient,
    Effect.flatMap(Config.redacted("ANTHROPIC_API_KEY"), (apiKey) => AnthropicClient.make({ apiKey }))
  );
  const googleLayer = Layer.scoped(
    GoogleAiClient.GoogleAiClient,
    Effect.flatMap(Config.redacted("GOOGLE_AI_API_KEY"), (apiKey) => GoogleAiClient.make({ apiKey }))
  );
  const openaiLayer = Layer.effect(
    OpenAiClient.OpenAiClient,
    Effect.flatMap(Config.redacted("OPENAI_API_KEY"), (apiKey) => OpenAiClient.make({ apiKey }))
  );

  return Layer.mergeAll(anthropicLayer, googleLayer, openaiLayer);
};

export const health = Command.make(
  "health",
  {
    provider: Options.choice("provider", ["openai", "anthropic", "google"]).pipe(
      Options.optional,
      Options.withDescription("Check specific provider health")
    ),
    detailed: Options.boolean("detailed").pipe(
      Options.optional,
      Options.withDescription("Show detailed health information")
    ),
    json: Options.boolean("json").pipe(
      Options.optional,
      Options.withDescription("Output results in JSON format")
    ),
    output: Options.file("output").pipe(
      Options.optional,
      Options.withDescription("Write output to file (overwrites if exists)")
    ),
    force: Options.boolean("force").pipe(
      Options.optional,
      Options.withDescription("Force overwrite output file if it exists")
    ),
    quiet: Options.boolean("quiet").pipe(
      Options.optional,
      Options.withDescription("Suppress normal output (errors still go to stderr)")
    )
  },
  ({ provider, detailed, json, output, force, quiet }) =>
    Effect.gen(function* () {
      const providerValue = EffectOption.match(provider, {
        onNone: () => null,
        onSome: (p) => p
      });

      const detailedMode = EffectOption.getOrElse(detailed, () => false);
      const jsonMode = EffectOption.getOrElse(json, () => false);
      const quietMode = EffectOption.getOrElse(quiet, () => false);

      const healthResults: Record<string, any> = {};

      if (!providerValue || providerValue === "openai") {
        healthResults.openai = yield* checkOpenAIHealth();
      }
      if (!providerValue || providerValue === "anthropic") {
        healthResults.anthropic = yield* checkAnthropicHealth();
      }
      if (!providerValue || providerValue === "google") {
        healthResults.google = yield* checkGoogleHealth();
      }

      const outputData = { timestamp: new Date().toISOString(), ...healthResults };

      if (jsonMode) {
        const jsonOutput = JSON.stringify(outputData, null, 2);
        yield* Console.log(jsonOutput);
      } else if (!quietMode) {
        yield* Console.log("🔍 Health Check Results:");
        if (providerValue) {
          yield* Console.log(`Provider: ${providerValue}`);
        }
        for (const [name, result] of Object.entries(healthResults)) {
          const status = result.status.includes("✅") ? "✅" : "❌";
          yield* Console.log(`${status} ${name}: ${result.status}`);
          if (detailedMode && result.details) {
            yield* Console.log(`  Details: ${result.details}`);
          }
        }
      }
    }).pipe(Effect.provide(createAiClientLayers()))
);

// Helper functions for OpenAI health check
const checkOpenAIHealth = () =>
  Effect.gen(function* () {
    const apiKeyOption = yield* Config.string(CONFIG_KEYS.OPENAI_API_KEY).pipe(
      Effect.option
    );

    const result = {
      provider: "openai",
      configured: false,
      apiKey: false,
      connection: false,
      models: [] as string[],
      error: null as string | null,
      status: "❌",
      details: ""
    };

    if (EffectOption.isNone(apiKeyOption)) {
      result.error = "No API key configured";
      result.status = "❌ No API key configured";
      return result;
    }

    result.apiKey = true;
    result.configured = true;

    try {
      // Use LLMService to check OpenAI connectivity
      const llmService = yield* LLMService;
      
      // Simple test - attempt a small generation
      const response = yield* llmService.generateText("Hello", "openai", "gpt-3.5-turbo");

      result.connection = true;
      result.status = "✅";
      result.details = "Successfully connected to OpenAI";
    } catch (error) {
      result.error = error instanceof Error ? error.message : "Connection failed";
      result.status = "❌";
    }

    return result;
  });

// Helper functions for Anthropic health check
const checkAnthropicHealth = () =>
  Effect.gen(function* () {
    const apiKeyOption = yield* Config.string(CONFIG_KEYS.ANTHROPIC_API_KEY).pipe(
      Effect.option
    );

    if (EffectOption.isNone(apiKeyOption)) {
      return {
        status: "❌ No API key configured",
        details: "No API key configured"
      };
    }

    const llmService = yield* LLMService;
    const effect = llmService.generateText("Hello!", "anthropic", "claude-3-haiku");

    return yield* Effect.match(effect, {
      onFailure: (error) => ({
        status: `❌ Connection failed`,
        details: error instanceof Error ? error.message : String(error)
      }),
      onSuccess: () => ({ status: "✅ Connected and functional" })
    });
  });

// Helper functions for Google health check
const checkGoogleHealth = () =>
  Effect.gen(function* () {
    const apiKey = yield* Config.string(CONFIG_KEYS.GOOGLE_AI_API_KEY).pipe(
      Effect.option
    );

    const result = {
      provider: "google",
      configured: false,
      apiKey: false,
      connection: false,
      models: [] as string[],
      error: null as string | null,
      status: "❌",
      details: ""
    };

    if (EffectOption.isNone(apiKey)) {
      result.error = "No API key configured";
      result.status = "❌";
      yield* Console.log("Google: ❌ No API key configured");
      return result;
    }

    result.apiKey = true;
    result.configured = true;

    try {
      // Use LLMService to check Google AI connectivity
      const llmService = yield* LLMService;

      // Attempt a simple generation as health check
      const response = yield* llmService.generateText("Hello", "google", "gemini-2.5-flash");

      result.connection = true;
      result.status = "✅";
      result.details = "Successfully connected to Google AI";
      yield* Console.log("Google: ✅ Connected and functional");
    } catch (error) {
      result.error = error instanceof Error ? error.message : "Connection failed";
      result.details = result.error;
      result.status = "❌";
      yield* Console.log(`Google: ❌ Connection failed - ${result.error}`);
    }

    return result;
  });
