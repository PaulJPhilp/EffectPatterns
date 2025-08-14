import { Args, Command } from "@effect/cli";
import { Effect } from "effect";
import { ModelService } from "../../services/model-service/service.js";
export const modelInfo = Command.make("info", {
    provider: Args.text({ name: "provider" }),
    model: Args.text({ name: "model" }),
}, ({ provider, model }) => Effect.gen(function* () {
    yield* Effect.log(`Getting info for ${provider} model: ${model}...`);
    const service = yield* ModelService.pipe(Effect.provide(ModelService.Default));
    const result = yield* Effect.either(service.getModel(model));
    if (result._tag === "Right") {
        const m = result.right;
        yield* Effect.log(`${m.name}: caps=[${m.capabilities.join(", ")}] context=${m.contextWindow} inputCost=${m.inputCostPerMillionTokens}/1M outputCost=${m.outputCostPerMillionTokens}/1M maxOut=${m.maxOutputTokens ?? "-"} cutoff=${m.knowledgeCutoff ?? "-"}`);
    }
    else {
        yield* Effect.log(`No info available for ${provider} ${model}`);
    }
}));
//# sourceMappingURL=info.js.map