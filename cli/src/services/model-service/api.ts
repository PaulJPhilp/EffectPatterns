import { Effect } from "effect";
import type { Model, Provider } from "./types.js";
import { ModelNotFoundError, ProviderNotFoundError } from "./errors.js";

export interface ModelServiceApi {
  readonly getModel: (
    modelName: string
  ) => Effect.Effect<Model, ModelNotFoundError>;

  readonly getModels: (
    providerName: string
  ) => Effect.Effect<Model[], ProviderNotFoundError>;

  readonly getProvider: (
    providerName: string
  ) => Effect.Effect<Provider, ProviderNotFoundError>;

  readonly listAllModels: () => Effect.Effect<Model[]>;

  readonly getModelsByCapability: (
    capability: string
  ) => Effect.Effect<Model[]>;

  readonly getModelsByProviderAndCapability: (
    providerName: string,
    capability: string
  ) => Effect.Effect<Model[], ProviderNotFoundError>;
}
