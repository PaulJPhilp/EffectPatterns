// Import necessary Effect modules
import { Config, Console, Effect, Layer, Stream, } from "effect";
import { AiLanguageModel } from "@effect/ai";
import { GoogleAiClient } from "@effect/ai-google";
import { OpenAiClient } from "@effect/ai-openai";
import { AnthropicClient } from "@effect/ai-anthropic";
import { logError, UnsupportedProviderError } from "./errors.js";
import { processMdxFile, isValidProvider } from "./utils.js";
import { selectModel } from "./types.js";
import { MetricsService } from "../metrics-service/service.js";
import { ConfigService } from "../config-service/service.js";
import { TemplateService } from "../prompt-template/service.js";
export const streamText = (prompt, provider, model, parameters) => {
    return Stream.unwrap(Effect.gen(function* () {
        yield* Console.info(`[LLM] Setting up streaming via ${provider} (${model})`);
        // Validate provider
        if (!isValidProvider(provider)) {
            return yield* Effect.fail(new UnsupportedProviderError({ provider }));
        }
        // Access the AiLanguageModel service through dependency injection
        // The AI client layers should be provided at the command level
        const languageModel = yield* AiLanguageModel.AiLanguageModel;
        const config = yield* ConfigService;
        const templateService = yield* TemplateService;
        // Prepend system prompt if configured
        const finalPrompt = yield* prependSystemPrompt(prompt, config, templateService);
        const stream = languageModel.streamText({
            prompt: finalPrompt,
        }).pipe(Stream.map((response) => response.text), Stream.tapError((error) => logError(error)), Stream.catchTags({
            RateLimitError: (error) => Stream.fromEffect(Console.error(`[AI] Rate limit exceeded: ${error.description}`).pipe(Effect.flatMap(() => Effect.fail(new Error(`Rate limit exceeded. Please try again later.`))))),
            InvalidInputError: (error) => Stream.fromEffect(Console.error(`[AI] Invalid input: ${error.description}`).pipe(Effect.flatMap(() => Effect.fail(new Error(`Invalid input: ${error.description}`))))),
            QuotaExceededError: (error) => Stream.fromEffect(Console.error(`[AI] Quota exceeded: ${error.description}`).pipe(Effect.flatMap(() => Effect.fail(new Error(`API quota exceeded. Please check your usage.`))))),
            AiError: (error) => Stream.fromEffect(Effect.gen(function* () {
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
            })),
        }));
        return stream;
    }));
};
export const generateText = Effect.fn("generateText")(function* (prompt, provider, model, parameters) {
    yield* Console.info(`[LLM] Sending prompt via ${provider} (${model}) (${prompt.length} chars)`);
    // Prepend system prompt if configured
    const config = yield* ConfigService;
    const templateService = yield* TemplateService;
    const finalPrompt = yield* prependSystemPrompt(prompt, config, templateService);
    // Create the appropriate model layer and AI client layer
    const llmModelLayer = selectModel(provider, model);
    const aiClientLayer = Layer.mergeAll(AnthropicClient.layerConfig({
        apiKey: Config.redacted("ANTHROPIC_API_KEY")
    }), GoogleAiClient.layerConfig({
        apiKey: Config.redacted("GOOGLE_AI_API_KEY")
    }), OpenAiClient.layerConfig({
        apiKey: Config.redacted("OPENAI_API_KEY")
    }));
    const combinedLayer = Layer.mergeAll(llmModelLayer, aiClientLayer);
    const response = yield* Effect.provide(AiLanguageModel.generateText({ prompt: finalPrompt }), combinedLayer).pipe(Effect.catchAll((error) => {
        return logError(error).pipe(Effect.andThen(Effect.fail(error)));
    }));
    // Record metrics with actual provider and model
    const metrics = yield* MetricsService;
    const usage = {
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
export const generateObject = Effect.fn("generateObject")(function* (prompt, schema, provider, model, parameters) {
    yield* Console.info(`[LLM] Generating object via ${provider} (${model}) (${prompt.length} chars)`);
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
    }).pipe(Effect.catchTags({
        AiError: (error) => {
            // Check if this is a rate limit error based on error description
            const isRateLimit = error.description.toLowerCase().includes("rate limit") ||
                error.description.toLowerCase().includes("quota") ||
                error.description.toLowerCase().includes("too many requests");
            if (isRateLimit) {
                return Effect.succeed({
                    object: null,
                    error: "Rate limit exceeded. Please try again later.",
                }).pipe(Effect.tap(() => Console.error(`Rate limit exceeded: ${error.description}`)));
            }
            // Handle other AI errors
            return Effect.succeed({
                object: null,
                error: "Service temporarily unavailable. Please try again later.",
            }).pipe(Effect.tap(() => Console.error(`AI error (${error.module}.${error.method}): ${error.description}`)));
        },
    }), Effect.catchAll((error) => Effect.succeed({
        object: null,
        error: "Service temporarily unavailable. Please try again later.",
    }).pipe(Effect.tap(() => Console.error(`Unexpected error: ${error}`)))));
    // Record metrics with actual provider and model
    const metrics = yield* MetricsService;
    const usage = {
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
export const processPromptFromMdx = Effect.fn("processPromptFromMdx")(function* (filePath, provider = "google", model = "gemini-2.5-flash") {
    yield* Console.info(`[LLM] Reading MDX prompt from file: ${filePath}`);
    const config = yield* processMdxFile(filePath);
    const response = yield* generateText(config.prompt, provider, model);
    yield* Console.info(`[LLM] Processed MDX prompt successfully`);
    return response;
});
export const processPromptFromText = Effect.fn("processPromptFromText")(function* (prompt, provider = "google", model = "gemini-2.5-flash") {
    yield* Console.info(`[LLM] Processing text prompt: ${prompt}`);
    const response = yield* generateText(prompt, provider, model);
    yield* Console.info(`[LLM] Processed text prompt successfully`);
    return response;
});
// Helper function to prepend system prompt to user prompt if configured
const prependSystemPrompt = (userPrompt, config, templateService) => Effect.gen(function* () {
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
export class LLMService extends Effect.Service()("LLMService", {
    effect: Effect.gen(function* () {
        return {
            generateText,
            generateObject,
            processPromptFromMdx,
            processPromptFromText,
            streamText,
        };
    }),
    dependencies: []
}) {
}
