// Import necessary Effect modules
import {
  Config,
  Console,
  Effect,
  Layer,
  Schema,
  Stream,
} from "effect";

import { AiLanguageModel, AiError } from "@effect/ai";
import { GoogleAiClient, GoogleAiLanguageModel } from "@effect/ai-google";
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
import { AnthropicClient, AnthropicLanguageModel } from "@effect/ai-anthropic";
import { logError, UnsupportedProviderError } from "./errors.js";
import { processMdxFile, isValidProvider } from "./utils.js";
import type { Providers, Models } from "./types.js";
import { selectModel } from "./types.js";
import { FileSystem } from "@effect/platform";
import { Path } from "@effect/platform";

export const streamText = (
  prompt: string,
  provider: Providers,
  model: Models,
  parameters?: Record<string, unknown>
): Stream.Stream<string, Error | AiError.AiError, AiLanguageModel.AiLanguageModel> => {
  return Stream.unwrap(
    Effect.gen(function* () {
      yield* Console.info(`[LLM] Setting up streaming via ${provider} (${model})`);

      // Validate provider
      if (!isValidProvider(provider)) {
        return yield* Effect.fail(new UnsupportedProviderError({ provider }));
      }

      // Access the AiLanguageModel service through dependency injection
      // The AI client layers should be provided at the command level
      const languageModel = yield* AiLanguageModel.AiLanguageModel;

      const stream = languageModel.streamText({
        prompt,
      }).pipe(
        Stream.map((response) => response.text),
        Stream.tapError((error) => logError(error)),
        Stream.catchTags({
          RateLimitError: (error) =>
            Stream.fromEffect(
              Console.error(`[AI] Rate limit exceeded: ${error.description}`).pipe(
                Effect.flatMap(() => Effect.fail(new Error(`Rate limit exceeded. Please try again later.`)))
              )
            ),
          InvalidInputError: (error) =>
            Stream.fromEffect(
              Console.error(`[AI] Invalid input: ${error.description}`).pipe(
                Effect.flatMap(() => Effect.fail(new Error(`Invalid input: ${error.description}`)))
              )
            ),
          QuotaExceededError: (error) =>
            Stream.fromEffect(
              Console.error(`[AI] Quota exceeded: ${error.description}`).pipe(
                Effect.flatMap(() => Effect.fail(new Error(`API quota exceeded. Please check your usage.`)))
              )
            ),
          AiError: (error) =>
            Stream.fromEffect(
              Effect.gen(function* () {
                yield* Console.error(`[AI] AI error: ${error.description}`);
                const description = error.description?.toLowerCase() || "";
                if (description.includes("rate limit") || description.includes("too many requests")) {
                  return yield* Effect.fail(new Error(`Rate limit exceeded. Please try again later.`));
                }
                if (description.includes("quota") || description.includes("exceeded")) {
                  return yield* Effect.fail(new Error(`API quota exceeded. Please check your usage.`));
                }
                if (description.includes("invalid") || description.includes("bad request")) {
                  return yield* Effect.fail(new Error(`Invalid request: ${error.description}`));
                }
                return yield* Effect.fail(new Error(`AI service error: ${error.description}`));
              })
            ),
        })
      );

      return stream;
    })
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

  // Create the appropriate model layer and AI client layer
  const llmModelLayer = selectModel(provider, model);
  const aiClientLayer = Layer.mergeAll(
    AnthropicClient.layerConfig({
      apiKey: Config.redacted("ANTHROPIC_API_KEY")
    }),
    GoogleAiClient.layerConfig({
      apiKey: Config.redacted("GOOGLE_AI_API_KEY")
    }),
    OpenAiClient.layerConfig({
      apiKey: Config.redacted("OPENAI_API_KEY")
    })
  );
  
  const combinedLayer = Layer.mergeAll(llmModelLayer, aiClientLayer);
  
  const response = yield* Effect.provide(
    AiLanguageModel.generateText({ prompt }),
    combinedLayer
  ).pipe(
    Effect.catchAll((error) => {
      return logError(error).pipe(Effect.andThen(Effect.fail(error)));
    })
  );

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

