import { Command, Options } from "@effect/cli";
import { Effect, Option as EffectOption } from "effect";
import { ConfigService } from "../../services/config-service/service.js";
import { ModelService } from "../../services/model-service/service.js";
export const modelList = Command.make("list", {
    provider: Options.optional(Options.text("provider").pipe(Options.withDescription("Filter models by provider (free text)"), Options.withAlias("p"))),
}, ({ provider }) => Effect.gen(function* () {
    const config = yield* ConfigService;
    const providerFromConfig = yield* config.get("defaultProvider");
    const providerValue = EffectOption.match(provider, {
        onNone: () => EffectOption.getOrElse(providerFromConfig, () => null),
        onSome: (p) => p,
    });
    yield* Effect.log(`Listing models${providerValue ? ` for ${providerValue}` : ""}...`);
    const service = yield* ModelService.pipe(Effect.provide(ModelService.Default));
    if (!providerValue || providerValue === "openai") {
        const result = yield* Effect.either(service.getModels("OpenAI"));
        if (result._tag === "Right") {
            const models = result.right;
            yield* Effect.log(`OpenAI models: ${models.map((m) => m.name).join(", ")}`);
        }
        else {
            yield* Effect.log("OpenAI: No models available");
        }
    }
    if (!providerValue || providerValue === "anthropic") {
        const result = yield* Effect.either(service.getModels("Anthropic"));
        if (result._tag === "Right") {
            const models = result.right;
            yield* Effect.log(`Anthropic models: ${models.map((m) => m.name).join(", ")}`);
        }
        else {
            yield* Effect.log("Anthropic: No models available");
        }
    }
    if (!providerValue || providerValue === "google") {
        const exit = yield* Effect.either(service.getModels("Google"));
        if (exit._tag === "Right") {
            const models = exit.right;
            yield* Effect.log(`Google models: ${models.map((m) => m.name).join(", ")}`);
        }
        else {
            yield* Effect.log("Google: No models available");
        }
    }
}));
//# sourceMappingURL=list.js.map