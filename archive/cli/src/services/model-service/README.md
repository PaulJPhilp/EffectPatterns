# Model Service

Provides access to a curated list of providers and their supported
models, with metadata such as capabilities, context window, costs, and
rate limits.

## Capabilities

- Look up a single model by name.
- List models for a given provider.
- Get a provider by name.
- List all known models.
- Filter models by capability.
- Filter models by provider and capability.

## API

```ts
interface ModelServiceApi {
  getModel: (
    modelName: string
  ) => Effect<Model, ModelNotFoundError>;

  getModels: (
    providerName: string
  ) => Effect<Model[], ProviderNotFoundError>;

  getProvider: (
    providerName: string
  ) => Effect<Provider, ProviderNotFoundError>;

  listAllModels: () => Effect<Model[]>;

  getModelsByCapability: (
    capability: string
  ) => Effect<Model[]>;

  getModelsByProviderAndCapability: (
    providerName: string,
    capability: string
  ) => Effect<Model[], ProviderNotFoundError>;
}
```

Types referenced above are defined in `types.ts`.

- `Model`: model metadata including `capabilities`, `contextWindow`,
  pricing, and optional `maxOutputTokens` and `knowledgeCutoff`.
- `Provider`: provider metadata including `name`, `apiKeyEnvVar`, and
  `supportedModels`.

## Return values

- `getModel`: returns a single `Model`.
- `getModels`: returns an array of `Model` for the provider.
- `getProvider`: returns a `Provider`.
- `listAllModels`: returns all curated `Model`s.
- `getModelsByCapability`: returns models supporting the capability.
- `getModelsByProviderAndCapability`: returns models for a provider that
  support the capability.

## Errors

All errors are `Data.TaggedError` from `errors.ts`.

- `ModelNotFoundError { modelName: string }` when a model is not found.
- `ProviderNotFoundError { providerName: string }` when a provider is
  not found.

## Implementation notes

- The service uses `Context.Tag`-based service in `service.ts` to match
  existing usage with `Effect.provideService`.
- All failures use `TaggedError` classes defined in `errors.ts`.
- Provider and model catalogs are currently hardcoded.
