import { Context, Effect } from "effect";
import type { Model, Provider } from "./types.js";
export interface ModelNotFoundError {
    readonly _tag: "ModelNotFoundError";
    readonly modelName: string;
}
export interface ProviderNotFoundError {
    readonly _tag: "ProviderNotFoundError";
    readonly providerName: string;
}
export declare const make: {
    getModel: (modelName: string) => Effect.Effect<Model, never, never> | Effect.Effect<never, ModelNotFoundError, never>;
    getModels: (providerName: string) => Effect.Effect<Model[], never, never> | Effect.Effect<never, ProviderNotFoundError, never>;
    getProvider: (providerName: string) => Effect.Effect<never, ProviderNotFoundError, never> | Effect.Effect<Provider, never, never>;
    listAllModels: () => Effect.Effect<Model[], never, never>;
    getModelsByCapability: (capability: string) => Effect.Effect<Model[], never, never>;
    getModelsByProviderAndCapability: (providerName: string, capability: string) => Effect.Effect<Model[], never, never> | Effect.Effect<never, ProviderNotFoundError, never>;
};
declare const ModelService_base: Context.TagClass<ModelService, "ModelService", {
    readonly getModel: (modelName: string) => Effect.Effect<Model, ModelNotFoundError>;
    readonly getModels: (providerName: string) => Effect.Effect<Model[], ProviderNotFoundError>;
    readonly getProvider: (providerName: string) => Effect.Effect<Provider, ProviderNotFoundError>;
    readonly listAllModels: () => Effect.Effect<Model[]>;
    readonly getModelsByCapability: (capability: string) => Effect.Effect<Model[]>;
    readonly getModelsByProviderAndCapability: (providerName: string, capability: string) => Effect.Effect<Model[], ProviderNotFoundError>;
}>;
export declare class ModelService extends ModelService_base {
}
export {};
