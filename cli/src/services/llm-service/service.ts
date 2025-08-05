// Import necessary Effect modules
import {
  Config,
  Console,
  Effect,
  Layer,
  Schema,
  Stream,
} from "effect";

import { AiLanguageModel } from "@effect/ai";
import { AnthropicClient } from "@effect/ai-anthropic";
import { GoogleAiClient } from "@effect/ai-google";
import { OpenAiClient } from "@effect/ai-openai";
import { HttpClient } from "@effect/platform";

import { ConfigService } from "../config-service/service.js";
import type { LLMUsage } from "../metrics-service/service.js";
import { MetricsService } from "../metrics-service/service.js";
import { TemplateService } from "../prompt-template/service.js";
import { logError, UnsupportedProviderError } from "./errors.js";
import type { Models, Providers } from "./types.js";
import { selectModel } from "./types.js";
import { isValidProvider, processMdxFile } from "./utils.js";

export const streamText = (
  prompt: string,
  provider: Providers,
  model: Models,
  parameters?: Record<string, unknown>
): Stream.Stream<string, Error, ConfigService | TemplateService | AnthropicClient.AnthropicClient | GoogleAiClient.GoogleAiClient | OpenAiClient.OpenAiClient | HttpClient.HttpClient> => {
  // Validate provider first
  if (!isValidProvider(provider)) {
    return Stream.fromEffect(Effect.fail(new UnsupportedProviderError({ provider })));
  }

  return Stream.unwrapScoped(
    Effect.gen(function* () {
      yield* Console.info(`[LLM] Setting up streaming via ${provider} (${model})`);

      const config = yield* ConfigService;
      const templateService = yield* TemplateService;

      // Prepend system prompt if configured
      const finalPrompt = yield* prependSystemPrompt(prompt, config, templateService);

      // Select the appropriate model layer and AI client layer
      const modelLayer = selectModel(provider, model);
      const aiClientLayer = createAiClientLayer(provider);
      const combinedLayer = Layer.mergeAll(modelLayer, aiClientLayer);

      // Create the streaming effect using unified AiLanguageModel interface
      const streamEffect = AiLanguageModel.streamText({
        prompt: finalPrompt,
        ...parameters
      });

      return Stream.provideLayer(streamEffect, combinedLayer);
    })
  ).pipe(
    Stream.map((response) => {
      // Extract text from AiResponse
      if (typeof response === 'string') {
        return response;
      }
      return response.text || JSON.stringify(response);
    }),
    Stream.catchAll((error) =>
      Stream.fromEffect(
        Effect.gen(function* () {
          yield* Console.error(`[AI] AI error: ${error}`);
          if (typeof error === 'object' && error !== null && 'description' in error) {
            const description = (error as any).description?.toLowerCase() || "";
            if (description.includes("rate limit") || description.includes("too many requests")) {
              return yield* Effect.fail(new Error(`Rate limit exceeded. Please try again later.`));
            }
            if (description.includes("quota") || description.includes("exceeded")) {
              return yield* Effect.fail(new Error(`API quota exceeded. Please check your usage.`));
            }
            if (description.includes("invalid") || description.includes("bad request")) {
              return yield* Effect.fail(new Error(`Invalid request: ${error.description}`));
            }
          }
          return yield* Effect.fail(new Error(`AI service error: ${error}`));
        })
      )
    )
  );
};

export const generateText = Effect.fn("generateText")(function* (
  prompt: string,
  provider: Providers,
  model: Models,
  parameters?: Record<string, unknown>
) {
  yield* Console.info(
    `[LLM] Sending prompt via ${provider} (${model}) (${prompt.length} chars)`
  );

  // Prepend system prompt if configured
  const config = yield* ConfigService;
  const templateService = yield* TemplateService;
  const finalPrompt = yield* prependSystemPrompt(prompt, config, templateService);

  // Create the appropriate model layer and AI client layer
  const llmModelLayer = selectModel(provider, model);
  const aiClientLayer = createAiClientLayer(provider);

  const combinedLayer = Layer.mergeAll(llmModelLayer, aiClientLayer);

  const response = yield* Effect.provide(
    AiLanguageModel.generateText({ prompt: finalPrompt }),
    combinedLayer
  ).pipe(
    Effect.catchAll((error) => {
      return logError(error).pipe(Effect.andThen(Effect.fail(error)));
    })
  );

  // Record metrics with actual provider and model
  const metrics = yield* MetricsService;
  const usage: LLMUsage = {
    provider,
    model,
    inputTokens: 0, // Calculate based on prompt length
    outputTokens: response.text.length || 0,
    thinkingTokens: 0,
    totalTokens: (prompt.length + response.text.length) || 0,
    estimatedCost: 0,
    inputCost: 0,
    outputCost: 0,
    totalCost: 0
  };

  yield* metrics.recordLLMUsage(usage);
  yield* Console.log(response.text);
  return response;
});

export const generateObject = Effect.fn("generateObject")(function* <
  T extends Record<string, unknown>
>(
  prompt: string,
  schema: Schema.Schema<T>,
  provider: Providers,
  model: Models,
  parameters?: Record<string, unknown>
) {
  yield* Console.info(
    `[LLM] Generating object via ${provider} (${model}) (${prompt.length} chars)`
  );

  // Validate provider
  if (!isValidProvider(provider)) {
    return yield* Effect.fail(new UnsupportedProviderError({ provider }));
  }

  // Access the AiLanguageModel service through dependency injection
  // The AI client layers should be provided at the command level
  const languageModel = yield* AiLanguageModel.AiLanguageModel;

  const response = yield* languageModel.generateObject({
    prompt,
    schema,
  }).pipe(
    Effect.catchTags({
      AiError: (error) => {
        // Check if this is a rate limit error based on error description
        const isRateLimit =
          error.description.toLowerCase().includes("rate limit") ||
          error.description.toLowerCase().includes("quota") ||
          error.description.toLowerCase().includes("too many requests");

        if (isRateLimit) {
          return Effect.succeed({
            object: null,
            error: "Rate limit exceeded. Please try again later.",
          } as any).pipe(
            Effect.tap(() =>
              Console.error(
                `Rate limit exceeded: ${error.description}`
              )
            )
          );
        }

        // Handle other AI errors
        return Effect.succeed({
          object: null,
          error: "Service temporarily unavailable. Please try again later.",
        } as any).pipe(
          Effect.tap(() =>
            Console.error(
              `AI error (${error.module}.${error.method}): ${error.description}`
            )
          )
        );
      },
    }),
    Effect.catchAll((error) =>
      Effect.succeed({
        object: null,
        error: "Service temporarily unavailable. Please try again later.",
      } as any).pipe(
        Effect.tap(() =>
          Console.error(`Unexpected error: ${error}`)
        )
      )
    )
  );

  // Record metrics with actual provider and model
  const metrics = yield* MetricsService;
  const usage: LLMUsage = {
    provider,
    model,
    inputTokens: 0, // Calculate based on prompt length
    outputTokens: JSON.stringify(response.object).length || 0,
    thinkingTokens: 0,
    totalTokens: (prompt.length + JSON.stringify(response.object).length) || 0,
    estimatedCost: 0,
    inputCost: 0,
    outputCost: 0,
    totalCost: 0
  };

  yield* metrics.recordLLMUsage(usage);
  yield* Console.log(response);
  return response;
});

export const processPromptFromMdx = Effect.fn("processPromptFromMdx")(
  function* (filePath: string, provider: Providers = "google", model: Models = "gemini-2.5-flash") {
    yield* Console.info(`[LLM] Reading MDX prompt from file: ${filePath}`);

    const config = yield* processMdxFile(filePath);
    const response = yield* generateText(config.prompt, provider, model);

    yield* Console.info(`[LLM] Processed MDX prompt successfully`);
    return response;
  }
);

export const processPromptFromText = Effect.fn("processPromptFromText")(
  function* (prompt: string, provider: Providers = "google", model: Models = "gemini-2.5-flash") {
    yield* Console.info(`[LLM] Processing text prompt: ${prompt}`);

    const response = yield* generateText(prompt, provider, model);

    yield* Console.info(`[LLM] Processed text prompt successfully`);
    return response;
  }
);

// Helper function to prepend system prompt to user prompt if configured
const prependSystemPrompt = (userPrompt: string, config: ConfigService, templateService: TemplateService): Effect.Effect<string, Error, never> =>
  Effect.gen(function* () {
    // Get system prompt file path from config
    const systemPromptFile = yield* config.getSystemPromptFile();

    // If no system prompt is set, return the user prompt as is
    if (systemPromptFile._tag === "None") {
      return userPrompt;
    }

    // Load and render the system prompt template
    const systemPromptTemplate = yield* templateService.loadTemplate(systemPromptFile.value);
    const systemPrompt = yield* templateService.renderTemplate(systemPromptTemplate, {});

    // Prepend system prompt to user prompt
    return `${systemPrompt}\n\n${userPrompt}`;
  });

// Helper function to create AI client layer based on provider
const createAiClientLayer = (provider: Providers) => {
  switch (provider) {
    case 'google':
      return GoogleAiClient.layerConfig({
        apiKey: Config.redacted("GOOGLE_AI_API_KEY")
      });
    case 'openai':
      return OpenAiClient.layerConfig({
        apiKey: Config.redacted("OPENAI_API_KEY")
      });
    case 'anthropic':
      return AnthropicClient.layerConfig({
        apiKey: Config.redacted("ANTHROPIC_API_KEY")
      });
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
};

export class LLMService extends Effect.Service<LLMService>()("LLMService", {
  effect: Effect.gen(function* () {
    return {
      generateText,
      generateObject,
      processPromptFromMdx,
      processPromptFromText,
      streamText,
    };
  }),
  dependencies: [] as const
}) { }

