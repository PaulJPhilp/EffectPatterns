import { Command, Options } from "@effect/cli";
import { Console, Effect, Option } from "effect";
import { ConfigService } from "../services/config-service/service.js";
import { LLMService } from "../services/llm-service/service.js";
import {
  ModelService,
  make as ModelServiceImpl,
} from "../services/model-service/service.js";
import type { Model as CatalogModel } from "../services/model-service/types.js";

export const health = Command.make(
  "health",
  {
    provider: Options.optional(
      Options.choice("provider", ["openai", "anthropic", "google"]).pipe(
        Options.withDescription("Check specific provider health")
      )
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
      Options.withDescription(
        "Suppress normal output (errors still go to stderr)"
      )
    ),
  },
  ({ provider, detailed, json, output, force, quiet }) =>
    Effect.gen(function* () {
      const config = yield* ConfigService;
      const providerFromConfig = yield* config.get("defaultProvider");
      const providerValue = Option.match(provider, {
        onSome: (p) => p,
        onNone: () =>
          Option.getOrElse(
            providerFromConfig as Option.Option<
              "openai" | "anthropic" | "google"
            >,
            () => null
          ),
      });

      const detailedMode = Option.getOrElse(detailed, () => false);
      const jsonMode = Option.getOrElse(json, () => false);
      const quietMode = Option.getOrElse(quiet, () => false);

      const healthResults: Record<
        string,
        { status: string; details?: string }
      > = {};

      if (!providerValue || providerValue === "openai") {
        healthResults.openai = yield* checkOpenAIHealth();
      }
      if (!providerValue || providerValue === "anthropic") {
        healthResults.anthropic = yield* checkAnthropicHealth();
      }
      if (!providerValue || providerValue === "google") {
        healthResults.google = yield* checkGoogleHealth();
      }

      const outputData = {
        timestamp: new Date().toISOString(),
        ...healthResults,
      };

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
    })
);

// Helper functions for OpenAI health check
const checkOpenAIHealth = () =>
  Effect.gen(function* () {
    const llmService = yield* LLMService;
    const modelService = yield* Effect.provideService(
      ModelService,
      ModelServiceImpl
    )(ModelService);
    const models = yield* modelService.getModels("OpenAI").pipe(
      Effect.map((ms: CatalogModel[]) => ms.map((m) => m.name)),
      Effect.catchAll(() => Effect.succeed<string[]>([]))
    );

    return yield* Effect.match(
      llmService.generateText("Hello", "openai", "gpt-3.5-turbo"),
      {
        onFailure: (error) => ({
          provider: "openai",
          connection: false,
          models,
          error: error instanceof Error ? error.message : String(error),
          status: "❌",
          details: error instanceof Error ? error.message : String(error),
        }),
        onSuccess: () => ({
          provider: "openai",
          connection: true,
          models,
          error: null,
          status: "✅",
          details: "Successfully connected to OpenAI",
        }),
      }
    );
  });

// Helper functions for Anthropic health check
const checkAnthropicHealth = () =>
  Effect.gen(function* () {
    const llmService = yield* LLMService;
    const modelService = yield* Effect.provideService(
      ModelService,
      ModelServiceImpl
    )(ModelService);
    const models = yield* modelService.getModels("Anthropic").pipe(
      Effect.map((ms: CatalogModel[]) => ms.map((m) => m.name)),
      Effect.catchAll(() => Effect.succeed<string[]>([]))
    );

    return yield* Effect.match(
      llmService.generateText("Hello!", "anthropic", "claude-3-haiku"),
      {
        onFailure: (error) => ({
          provider: "anthropic",
          connection: false,
          models,
          error: error instanceof Error ? error.message : String(error),
          status: "❌",
          details: error instanceof Error ? error.message : String(error),
        }),
        onSuccess: () => ({
          provider: "anthropic",
          connection: true,
          models,
          error: null,
          status: "✅",
          details: "Successfully connected to Anthropic",
        }),
      }
    );
  });

// Helper functions for Google health check
const checkGoogleHealth = () =>
  Effect.gen(function* () {
    const llmService = yield* LLMService;
    const modelService = yield* Effect.provideService(
      ModelService,
      ModelServiceImpl
    )(ModelService);
    const models = yield* modelService.getModels("Google").pipe(
      Effect.map((ms: CatalogModel[]) => ms.map((m) => m.name)),
      Effect.catchAll(() => Effect.succeed<string[]>([]))
    );

    return yield* Effect.match(
      llmService.generateText("Hello", "google", "gemini-2.5-flash"),
      {
        onFailure: (error) => ({
          provider: "google",
          connection: false,
          models,
          error: error instanceof Error ? error.message : String(error),
          status: "❌",
          details: error instanceof Error ? error.message : String(error),
        }),
        onSuccess: () => ({
          provider: "google",
          connection: true,
          models,
          error: null,
          status: "✅",
          details: "Successfully connected to Google AI",
        }),
      }
    );
  });
