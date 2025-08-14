import { Options } from "@effect/cli";
import { Effect, Option } from "effect";
import { ConfigService } from "../services/config-service/service.js";
import { LLMService } from "../services/llm-service/service.js";
import { ModelService } from "../services/model-service/service.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { makeCommand, printJson, printText, setGlobalJson, setGlobalCompact, setGlobalOutputOptions, getGlobalJson, getGlobalCompact, getGlobalOutputOptions, optQuiet, optForce, optOutput, } from "./_shared.js";
export const health = makeCommand("health", {
    provider: Options.optional(Options.choice("provider", ["openai", "anthropic", "google"]).pipe(Options.withDescription("Check specific provider health"), Options.withAlias("p"))),
    detailed: Options.boolean("detailed").pipe(Options.optional, Options.withDescription("Show detailed health information")),
    json: Options.boolean("json").pipe(Options.optional),
    compact: Options.boolean("compact").pipe(Options.optional),
    output: optOutput("Write output to file (overwrites if exists)"),
    force: optForce("Force overwrite output file if it exists"),
    quiet: optQuiet("Suppress normal output (errors still go to stderr)"),
}, ({ provider, detailed, json, compact, output, force, quiet }) => Effect.gen(function* () {
    const config = yield* ConfigService;
    const providerFromConfig = yield* config.get("defaultProvider");
    const providerValue = Option.match(provider, {
        onSome: (p) => p,
        onNone: () => Option.getOrElse(providerFromConfig, () => null),
    });
    const detailedMode = Option.getOrElse(detailed, () => false);
    const jsonFlag = Option.getOrElse(json, () => false);
    const compactFlag = Option.getOrElse(compact, () => false);
    const quietFlag = Option.getOrElse(quiet, () => false);
    const forceFlag = Option.getOrElse(force, () => false);
    const localOutput = Option.getOrElse(output, () => undefined);
    // Set global flags for helpers
    setGlobalJson(jsonFlag);
    setGlobalCompact(compactFlag);
    setGlobalOutputOptions(quietFlag || localOutput || forceFlag
        ? {
            quiet: quietFlag || undefined,
            outputFile: localOutput,
            force: forceFlag || undefined,
        }
        : undefined);
    const resolvedOutput = getGlobalOutputOptions()?.outputFile;
    const asJson = getGlobalJson() || !!resolvedOutput;
    const useCompact = getGlobalCompact();
    const healthResults = {};
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
    if (asJson) {
        yield* printJson(outputData, useCompact, resolvedOutput ? { outputFile: resolvedOutput } : undefined);
        return;
    }
    const lines = [];
    lines.push("🔍 Health Check Results:");
    if (providerValue) {
        lines.push(`Provider: ${providerValue}`);
    }
    for (const [name, result] of Object.entries(healthResults)) {
        const status = result.status.includes("✅") ? "✅" : "❌";
        lines.push(`${status} ${name}: ${result.status}`);
        if (detailedMode && result.details) {
            lines.push(`  Details: ${result.details}`);
        }
    }
    yield* printText(lines.join("\n"), resolvedOutput ? { outputFile: resolvedOutput } : undefined);
}), {
    description: "Check provider connectivity and model availability",
    errorPrefix: "Error in health command",
});
// Helper functions for OpenAI health check
const checkOpenAIHealth = () => Effect.gen(function* () {
    const llmService = yield* LLMService;
    const modelService = yield* Effect.provide(ModelService, ModelService.Default);
    const models = yield* modelService.getModels("OpenAI").pipe(Effect.map((ms) => ms.map((m) => m.name)), Effect.catchAll(() => Effect.succeed([])));
    return yield* Effect.match(llmService.generateText("Hello", "openai", "gpt-3.5-turbo"), {
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
    });
});
// Helper functions for Anthropic health check
const checkAnthropicHealth = () => Effect.gen(function* () {
    const llmService = yield* LLMService;
    const modelService = yield* ModelService.pipe(Effect.provide(ModelService.Default));
    const models = yield* modelService.getModels("Anthropic").pipe(Effect.map((ms) => ms.map((m) => m.name)), Effect.catchAll(() => Effect.succeed([])));
    return yield* Effect.match(llmService.generateText("Hello!", "anthropic", "claude-3-haiku"), {
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
    });
});
// Helper functions for Google health check
const checkGoogleHealth = () => Effect.gen(function* () {
    const llmService = yield* LLMService;
    const modelService = yield* Effect.provide(ModelService, ModelService.Default);
    const models = yield* modelService.getModels("Google").pipe(Effect.map((ms) => ms.map((m) => m.name)), Effect.catchAll(() => Effect.succeed([])));
    return yield* Effect.match(llmService.generateText("Hello", "google", "gemini-2.5-flash"), {
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
    });
});
//# sourceMappingURL=health.js.map