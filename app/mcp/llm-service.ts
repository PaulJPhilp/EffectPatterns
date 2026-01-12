import {
  generateText as aiGenerateText,
  streamText as aiStreamText,
  type CoreMessage,
  type LanguageModel,
  type ToolSet
} from "ai";
import { Data } from "effect";
import * as Effect from "effect/Effect";

// --- TYPES ---

export interface LLMRequest {
  model: LanguageModel;
  messages: CoreMessage[];
  system?: string;
  tools?: ToolSet;
  maxTokens?: number;
  temperature?: number;
}

export interface StreamingLLMRequest extends LLMRequest {
  onFinish?: (result: { usage: any }) => Effect.Effect<void>;
  experimental_transform?: any;
  stopWhen?: any;
}

export interface LLMResponse {
  text: string;
  usage?: any;
  finishReason?: string;
}

// --- ERRORS ---

export class LLMError extends Data.TaggedError("LLMError")<{
  cause: unknown;
  message: string;
}> { }

// --- SERVICE DEFINITION ---

export class LLMService extends Effect.Service<LLMService>()("LLMService", {
  effect: Effect.gen(function* () {
    return {
      // Non-streaming text generation
      generateText: (
        request: LLMRequest
      ): Effect.Effect<LLMResponse, LLMError> =>
        Effect.gen(function* () {
          try {
            const result = yield* Effect.promise(() =>
              aiGenerateText({
                model: request.model,
                messages: request.messages,
                system: request.system,
                temperature: request.temperature,
              })
            );

            return {
              text: result.text,
              usage: result.usage,
              finishReason: result.finishReason,
            };
          } catch (error) {
            return yield* Effect.fail(
              new LLMError({
                cause: error,
                message: `Failed to generate text: ${error instanceof Error ? error.message : String(error)}`,
              })
            );
          }
        }),

      // Streaming text generation
      streamText: (
        request: StreamingLLMRequest
      ): Effect.Effect<any, LLMError> =>
        Effect.gen(function* () {
          try {
            // aiStreamText returns a StreamTextResult directly, not a Promise
            const result = aiStreamText({
              model: request.model,
              messages: request.messages,
              system: request.system,
              tools: request.tools,
              temperature: request.temperature,
              onFinish: request.onFinish
                ? (result) => {
                  // Convert the Effect callback to a Promise for the AI library
                  Effect.runPromise(request.onFinish!(result)).catch(() => {
                    // Ignore errors in onFinish callback
                  });
                }
                : undefined,
            });

            return result;
          } catch (error) {
            return yield* Effect.fail(
              new LLMError({
                cause: error,
                message: `Failed to stream text: ${error instanceof Error ? error.message : String(error)}`,
              })
            );
          }
        }),
    };
  }),

  dependencies: [],
}) { }

// --- LIVE IMPLEMENTATION ---

export const LLMServiceLive = LLMService.Default;

// --- ACCESSORS ---

export const generateText = (request: LLMRequest) =>
  Effect.flatMap(LLMService, (service) => service.generateText(request));

export const streamText = (request: StreamingLLMRequest) =>
  Effect.flatMap(LLMService, (service) => service.streamText(request));
