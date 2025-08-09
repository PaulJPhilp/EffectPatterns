import { Args, Command, Options } from "@effect/cli";
import { Console, Effect, Option as EffectOption } from "effect";
import { ConfigService } from "../services/config-service/service.js";
import { ModelService, make as ModelServiceImpl, } from "../services/model-service/service.js";
// Model list command
const modelList = Command.make("list", {
    provider: Options.optional(Options.text("provider").pipe(Options.withDescription("Filter models by provider (free text)"), Options.withAlias("p"))),
}, ({ provider }) => Effect.gen(function* () {
    const config = yield* ConfigService;
    const providerFromConfig = yield* config.get("defaultProvider");
    const providerValue = EffectOption.match(provider, {
        onNone: () => EffectOption.getOrElse(providerFromConfig, () => null),
        onSome: (p) => p,
    });
    yield* Console.log(`Listing models${providerValue ? ` for ${providerValue}` : ""}...`);
    const service = yield* Effect.provideService(ModelService, ModelServiceImpl)(ModelService);
    if (!providerValue || providerValue === "openai") {
        const result = yield* Effect.either(service.getModels("OpenAI"));
        if (result._tag === "Right") {
            const models = result.right;
            yield* Console.log(`OpenAI models: ${models.map((m) => m.name).join(", ")}`);
        }
        else {
            yield* Console.log("OpenAI: No models available");
        }
    }
    if (!providerValue || providerValue === "anthropic") {
        const result = yield* Effect.either(service.getModels("Anthropic"));
        if (result._tag === "Right") {
            const models = result.right;
            yield* Console.log(`Anthropic models: ${models.map((m) => m.name).join(", ")}`);
        }
        else {
            yield* Console.log("Anthropic: No models available");
        }
    }
    if (!providerValue || providerValue === "google") {
        const exit = yield* Effect.either(service.getModels("Google"));
        if (exit._tag === "Right") {
            const models = exit.right;
            yield* Console.log(`Google models: ${models.map((m) => m.name).join(", ")}`);
        }
        else {
            yield* Console.log("Google: No models available");
        }
    }
}));
// Model info command
const modelInfo = Command.make("info", {
    provider: Args.text({ name: "provider" }),
    model: Args.text({ name: "model" }),
}, ({ provider, model }) => Effect.gen(function* () {
    yield* Console.log(`Getting info for ${provider} model: ${model}...`);
    const service = yield* Effect.provideService(ModelService, ModelServiceImpl)(ModelService);
    const result = yield* Effect.either(service.getModel(model));
    if (result._tag === "Right") {
        const m = result.right;
        yield* Console.log(`${m.name}: caps=[${m.capabilities.join(", ")}] context=${m.contextWindow} inputCost=${m.inputCostPerMillionTokens}/1M outputCost=${m.outputCostPerMillionTokens}/1M maxOut=${m.maxOutputTokens ?? "-"} cutoff=${m.knowledgeCutoff ?? "-"}`);
    }
    else {
        yield* Console.log(`No info available for ${provider} ${model}`);
    }
}));
// Export the model command with subcommands
export const modelCommand = Command.make("model").pipe(Command.withSubcommands([modelList, modelInfo]));
