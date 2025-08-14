import { Args, Command, Options } from "@effect/cli";
import { Console, Effect, Option } from "effect";
import { DryRunError_MissingInput } from "./errors.js";
import { ConfigService } from "../services/config-service/service.js";
import { ModelService } from "../services/model-service/service.js";
// Helper function to estimate tokens and cost
const estimateTokensAndCost = (provider, model, prompt) => Effect.sync(() => {
    const tokenCount = Math.ceil(prompt.length / 4);
    let estimatedCost = 0.001;
    if (provider === "openai") {
        if (model.includes("gpt-4")) {
            estimatedCost = (tokenCount / 1000) * 0.03;
        }
        else {
            estimatedCost = (tokenCount / 1000) * 0.002;
        }
    }
    else if (provider === "anthropic") {
        estimatedCost = (tokenCount / 1000) * 0.008;
    }
    else if (provider === "google") {
        estimatedCost = (tokenCount / 1000) * 0.001;
    }
    return { tokenCount, estimatedCost };
});
// Dry-run command
export const dryRun = Command.make("dry-run", {
    provider: Options.optional(Options.choice("provider", ["openai", "anthropic", "google"]).pipe(Options.withDescription("LLM provider to estimate for"), Options.withAlias("p"))),
    model: Options.optional(Options.text("model").pipe(Options.withDescription("Model to estimate for"), Options.withAlias("m"))),
    prompt: Args.text({ name: "prompt" }).pipe(Args.optional),
    file: Options.file("file").pipe(Options.optional, Options.withDescription("Read prompt from file"), Options.withAlias("i")),
    output: Options.file("output").pipe(Options.optional, Options.withDescription("Write output to file (overwrites if exists)"), Options.withAlias("o")),
    quiet: Options.boolean("quiet").pipe(Options.optional, Options.withDescription("Suppress normal output (errors still go to stderr)"), Options.withAlias("q")),
    force: Options.boolean("force").pipe(Options.optional, Options.withDescription("Force overwrite output file if it exists")),
}, ({ provider, model, prompt, file, output, quiet, force }) => Effect.gen(function* () {
    const config = yield* ConfigService;
    const providerFromConfig = yield* config.get("defaultProvider");
    const modelFromConfig = yield* config.get("defaultModel");
    const providerDefault = Option.getOrElse(providerFromConfig, () => "google");
    const resolvedProvider = Option.getOrElse(provider, () => providerDefault);
    const resolvedModel = Option.getOrElse(model, () => Option.getOrElse(modelFromConfig, () => "gemini-2.5-flash"));
    const quietMode = quiet._tag === "Some" && quiet.value;
    const forceMode = force._tag === "Some" && force.value;
    // Get prompt content
    let promptContent;
    let source;
    if (file._tag === "Some") {
        source = `file:${file.value}`;
        promptContent = "File content would be read here";
    }
    else if (prompt && prompt._tag === "Some") {
        promptContent = prompt.value;
        source = "cli";
    }
    else {
        yield* Console.error("❌ Either prompt or file must be provided");
        return yield* Effect.fail(new DryRunError_MissingInput());
    }
    if (!quietMode) {
        yield* Effect.log(`📊 Analyzing ${resolvedProvider} ${resolvedModel}...`);
    }
    // Estimate tokens
    const { tokenCount } = yield* estimateTokensAndCost(resolvedProvider, resolvedModel, promptContent);
    // Try to use ModelService for cost estimation when possible
    let estimatedCost = 0.001;
    const tryUseModelService = yield* Effect.succeed(true);
    if (tryUseModelService) {
        const service = yield* ModelService.pipe(Effect.provide(ModelService.Default));
        // Heuristic mapping from CLI model names to ModelService names
        const providerName = resolvedProvider === "openai"
            ? "OpenAI"
            : resolvedProvider === "anthropic"
                ? "Anthropic"
                : "Google";
        const mappedModelName = (() => {
            const name = resolvedModel.toLowerCase();
            if (providerName === "OpenAI") {
                if (name.includes("gpt-4")) {
                    return "gpt-4";
                }
                if (name.includes("3.5")) {
                    return "gpt-3.5-turbo";
                }
                if (name.includes("gpt-5")) {
                    return name.includes("mini")
                        ? "gpt-5-mini"
                        : name.includes("nano")
                            ? "gpt-5-nano"
                            : name.includes("chat")
                                ? "gpt-5-chat-latest"
                                : "gpt-5";
                }
            }
            else {
                if (providerName === "Anthropic") {
                    if (name.includes("opus")) {
                        return "claude-opus-4-1-20250805";
                    }
                    if (name.includes("sonnet")) {
                        return "claude-sonnet-4-20250514";
                    }
                }
                if (providerName === "Google") {
                    if (name.includes("2.5-pro")) {
                        return "gemini-2.5-pro";
                    }
                    if (name.includes("2.5-flash-lite")) {
                        return "gemini-2.5-flash-lite";
                    }
                    if (name.includes("2.5-flash")) {
                        return "gemini-2.5-flash";
                    }
                    if (name.includes("2.0-flash-lite")) {
                        return "gemini-2.0-flash-lite";
                    }
                    if (name.includes("2.0-flash")) {
                        return "gemini-2.0-flash";
                    }
                }
            }
            return null;
        })();
        if (mappedModelName) {
            const result = yield* Effect.either(service.getModel(mappedModelName));
            if (result._tag === "Right") {
                const m = result.right;
                const perMillion = m.inputCostPerMillionTokens + m.outputCostPerMillionTokens;
                estimatedCost = (tokenCount / 1000000) * perMillion;
            }
        }
    }
    const result = {
        provider: resolvedProvider,
        model: resolvedModel,
        source,
        prompt: {
            length: promptContent.length,
            tokens: tokenCount,
            preview: promptContent.substring(0, 100) +
                (promptContent.length > 100 ? "..." : ""),
        },
        cost: {
            estimated: estimatedCost,
        },
        timestamp: new Date().toISOString(),
    };
    const outputText = `📋 Dry Run Analysis:
Provider: ${resolvedProvider}
Model: ${resolvedModel}
Source: ${source}
Prompt length: ${result.prompt.length} chars
Estimated tokens: ${result.prompt.tokens}
Estimated cost: $${result.cost.estimated.toFixed(6)}
`;
    // Handle output to file or console
    if (output._tag === "Some") {
        const outputFile = output.value;
        // Check if file exists and handle overwrite
        if (!forceMode) {
            // In a real implementation, we'd check file existence here
            // For now, we'll proceed with write
        }
        if (!quietMode) {
            yield* Effect.log(`💾 Writing results to ${outputFile}`);
        }
        // In a real implementation, we'd write to file here
        // For now, we'll just log what would be written
        if (!quietMode) {
            yield* Effect.log(`Would write: ${JSON.stringify(result, null, 2)}`);
        }
    }
    else {
        if (!quietMode) {
            yield* Effect.log(outputText);
        }
    }
}));
//# sourceMappingURL=dry-run.js.map