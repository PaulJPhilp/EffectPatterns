import { Effect } from "effect";
import type { Model, Provider } from "./types.js";
import { ModelNotFoundError, ProviderNotFoundError } from "./errors.js";
export type { ModelNotFoundError, ProviderNotFoundError } from "./errors.js";
declare const ModelService_base: Effect.Service.Class<ModelService, "ModelService", {
    readonly sync: () => {
        getModel: (modelName: string) => Effect.Effect<Model, never, never> | Effect.Effect<never, ModelNotFoundError, never>;
        getModels: (providerName: string) => Effect.Effect<Model[], never, never> | Effect.Effect<never, ProviderNotFoundError, never>;
        getProvider: (providerName: string) => Effect.Effect<never, ProviderNotFoundError, never> | Effect.Effect<Provider, never, never>;
        listAllModels: () => Effect.Effect<Model[], never, never>;
        getModelsByCapability: (capability: string) => Effect.Effect<Model[], never, never>;
        getModelsByProviderAndCapability: (providerName: string, capability: string) => Effect.Effect<Model[], never, never> | Effect.Effect<never, ProviderNotFoundError, never>;
    };
}>;
export declare class ModelService extends ModelService_base {
}
//# sourceMappingURL=service.d.ts.map