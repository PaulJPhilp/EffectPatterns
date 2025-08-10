// Import necessary Effect modules
import { Config, Console, Effect, ExecutionPlan, Layer, Option, Schedule, Stream, } from "effect";
import { AiLanguageModel } from "@effect/ai";
import { AnthropicClient } from "@effect/ai-anthropic";
import { GoogleAiClient } from "@effect/ai-google";
import { OpenAiClient } from "@effect/ai-openai";
import { ConfigService } from "../config-service/service.js";
import { MetricsService } from "../metrics-service/service.js";
import { TemplateService } from "../prompt-template/service.js";
import { LlmServiceError, QuotaExceededError, RateLimitError, UnsupportedProviderError, } from "./errors.js";
import { selectModel } from "./types.js";
import { isValidProvider, processMdxFile } from "./utils.js";
export const streamText = (prompt, provider, model, parameters) => {
    // Validate provider first
    if (!isValidProvider(provider)) {
        return Stream.fromEffect(Effect.fail(new UnsupportedProviderError({ provider })));
    }
    return Stream.unwrapScoped(Effect.gen(function* () {
        yield* Console.info(`[LLM] Setting up streaming via ${provider} (${model})`);
        const config = yield* ConfigService;
        const templateService = yield* TemplateService;
        // Prepend system prompt if configured
        const finalPrompt = yield* prependSystemPrompt(prompt, config, templateService);
        // Create the streaming program requiring AiLanguageModel
        const streamProgram = AiLanguageModel.streamText({
            prompt: finalPrompt,
            ...parameters,
        });
        // Build an execution plan with optional config overrides
        const plan = yield* buildLlmExecutionPlanEffect(provider, model);
        return Stream.withExecutionPlan(streamProgram, plan);
    })).pipe(Stream.map((response) => {
        // Extract text from AiResponse
        if (typeof response === "string") {
            return response;
        }
        return response.text || JSON.stringify(response);
    }), Stream.catchAll((error) => Stream.fromEffect(Effect.gen(function* () {
        yield* Console.error(`[AI] AI error: ${error}`);
        if (typeof error === "object" &&
            error !== null &&
            "description" in error) {
            const description = error.description?.toLowerCase() || "";
            if (description.includes("rate limit") ||
                description.includes("too many requests")) {
                return yield* Effect.fail(new RateLimitError({
                    provider,
                    reason: "Rate limit exceeded. Please try again later.",
                }));
            }
            if (description.includes("quota") ||
                description.includes("exceeded")) {
                return yield* Effect.fail(new QuotaExceededError({
                    provider,
                    reason: "API quota exceeded. Please check your usage.",
                }));
            }
            if (description.includes("invalid") ||
                description.includes("bad request")) {
                return yield* Effect.fail(new LlmServiceError({
                    provider,
                    reason: `Invalid request: ${error.description}`,
                }));
            }
        }
        return yield* Effect.fail(new LlmServiceError({
            provider,
            reason: `AI service error: ${error}`,
        }));
    }))));
};
export const generateText = Effect.fn("generateText")(function* (prompt, provider, model, parameters) {
    yield* Console.info(`[LLM] Sending prompt via ${provider} (${model}) (${prompt.length} chars)`);
    // Prepend system prompt if configured
    const config = yield* ConfigService;
    const templateService = yield* TemplateService;
    const finalPrompt = yield* prependSystemPrompt(prompt, config, templateService);
    // Build an execution plan with optional config overrides
    const plan = yield* buildLlmExecutionPlanEffect(provider, model);
    const response = yield* Effect.withExecutionPlan(AiLanguageModel.generateText({ prompt: finalPrompt, ...parameters }), plan).pipe(Effect.catchAll((error) => Effect.fail(new LlmServiceError({
        provider,
        reason: "Service temporarily unavailable. Please try again later.",
    }))));
    // Record metrics with actual token usage from response
    const metrics = yield* MetricsService;
    // Extract actual usage data from response metadata
    const usageData = response.usage || {};
    const inputTokens = usageData.promptTokens || usageData.inputTokens || 0;
    const outputTokens = usageData.completionTokens || usageData.outputTokens || 0;
    const thinkingTokens = usageData.reasoningTokens || usageData.thinkingTokens || 0;
    const totalTokens = usageData.totalTokens || inputTokens + outputTokens + thinkingTokens;
    const usage = {
        provider,
        model,
        inputTokens,
        outputTokens,
        thinkingTokens,
        totalTokens,
        estimatedCost: 0,
        inputCost: 0,
        outputCost: 0,
        totalCost: 0,
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
    // Build an execution plan with optional config overrides
    const plan = yield* buildLlmExecutionPlanEffect(provider, model);
    const response = yield* Effect.withExecutionPlan(AiLanguageModel.generateObject({
        prompt,
        schema,
        ...parameters,
    }), plan).pipe(Effect.catchTags({
        AiError: (error) => {
            // Check if this is a rate limit error based on error description
            const isRateLimit = error.description.toLowerCase().includes("rate limit") ||
                error.description.toLowerCase().includes("quota") ||
                error.description.toLowerCase().includes("too many requests");
            if (isRateLimit) {
                return Effect.fail(new RateLimitError({
                    provider,
                    reason: "Rate limit exceeded. Please try again later.",
                }));
            }
            // Handle other AI errors
            return Effect.fail(new LlmServiceError({
                provider,
                reason: "Service temporarily unavailable. Please try again later.",
            }));
        },
    }), Effect.catchAll((error) => Effect.fail(new LlmServiceError({
        provider,
        reason: "Service temporarily unavailable. Please try again later.",
    }))));
    // Record metrics with actual token usage from response
    const metrics = yield* MetricsService;
    // Extract actual usage data from response metadata
    const usageData = response.usage || {};
    const inputTokens = usageData.promptTokens || usageData.inputTokens || 0;
    const outputTokens = usageData.completionTokens || usageData.outputTokens || 0;
    const thinkingTokens = usageData.reasoningTokens || usageData.thinkingTokens || 0;
    const totalTokens = usageData.totalTokens || inputTokens + outputTokens + thinkingTokens;
    const usage = {
        provider,
        model,
        inputTokens,
        outputTokens,
        thinkingTokens,
        totalTokens,
        estimatedCost: 0,
        inputCost: 0,
        outputCost: 0,
        totalCost: 0,
    };
    yield* metrics.recordLLMUsage(usage);
    yield* Console.log(response);
    return response;
});
export const processPromptFromMdx = Effect.fn("processPromptFromMdx")(function* (filePath, provider = "google", model = "gemini-2.5-flash") {
    yield* Console.info(`[LLM] Reading MDX prompt from file: ${filePath}`);
    const config = yield* processMdxFile(filePath);
    const response = yield* generateText(config.prompt, provider, model);
    yield* Console.info("[LLM] Processed MDX prompt successfully");
    return response;
});
export const processPromptFromText = Effect.fn("processPromptFromText")(function* (prompt, provider = "google", model = "gemini-2.5-flash") {
    yield* Console.info(`[LLM] Processing text prompt: ${prompt}`);
    const response = yield* generateText(prompt, provider, model);
    yield* Console.info("[LLM] Processed text prompt successfully");
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
// Helper function to create AI client layer based on provider
const createAiClientLayer = (provider) => {
    switch (provider) {
        case "google":
            return GoogleAiClient.layerConfig({
                apiKey: Config.redacted("GOOGLE_AI_API_KEY"),
            });
        case "openai":
            return OpenAiClient.layerConfig({
                apiKey: Config.redacted("OPENAI_API_KEY"),
            });
        case "anthropic":
            return AnthropicClient.layerConfig({
                apiKey: Config.redacted("ANTHROPIC_API_KEY"),
            });
        default:
            return Layer.fail(new UnsupportedProviderError({ provider: String(provider) }));
    }
};
// Helper to merge model + client into a single provider layer
const createProviderLayer = (provider, model) => Layer.mergeAll(selectModel(provider, model), createAiClientLayer(provider));
// Build an ExecutionPlan, honoring configuration overrides for primary retries/delay
export const buildLlmExecutionPlanEffect = (primaryProvider, primaryModel) => Effect.gen(function* () {
    const config = yield* ConfigService;
    const retriesOpt = yield* config.get("planRetries");
    const retryMsOpt = yield* config.get("planRetryMs");
    const retries = Option.match(retriesOpt, {
        onNone: () => 1,
        onSome: (s) => {
            const n = Number.parseInt(String(s), 10);
            return Number.isFinite(n) && n >= 0 ? n : 1;
        },
    });
    const retryMs = Option.match(retryMsOpt, {
        onNone: () => 1000,
        onSome: (s) => {
            const n = Number.parseInt(String(s), 10);
            return Number.isFinite(n) && n >= 0 ? n : 1000;
        },
    });
    const attempts = retries + 1; // convert retries -> attempts
    const primaryLayer = createProviderLayer(primaryProvider, primaryModel);
    // Fallbacks: either from config or defaults excluding primary
    const fallbacksJson = yield* config.get("planFallbacks");
    const defaultFallbacks = [
        { provider: "openai", model: "gpt-4o-mini" },
        { provider: "anthropic", model: "claude-3-5-haiku" },
    ].filter((f) => f.provider !== primaryProvider);
    const parsedFallbacks = Option.match(fallbacksJson, {
        onNone: () => defaultFallbacks,
        onSome: (v) => {
            try {
                const arr = JSON.parse(String(v));
                return arr
                    .filter((f) => f?.provider && f?.model)
                    .filter((f) => f.provider !== primaryProvider);
            }
            catch {
                return defaultFallbacks;
            }
        },
    });
    const fallbackLayers = parsedFallbacks.map(({ provider, model }) => createProviderLayer(provider, model));
    return ExecutionPlan.make({
        provide: primaryLayer,
        attempts,
        schedule: Schedule.spaced(retryMs),
    }, ...fallbackLayers.map((layer) => ({
        provide: layer,
        attempts: 1,
        schedule: Schedule.spaced(1500),
    })));
});
export class LLMService extends Effect.Service()("LLMService", {
    effect: Effect.succeed({
        generateText,
        generateObject,
        processPromptFromMdx,
        processPromptFromText,
        streamText,
    }),
    dependencies: [],
}) {
}
