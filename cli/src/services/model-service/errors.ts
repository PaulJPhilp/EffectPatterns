import { Data } from "effect";

export class ModelNotFoundError extends Data.TaggedError(
  "ModelNotFoundError"
)<{ modelName: string }> {}

export class ProviderNotFoundError extends Data.TaggedError(
  "ProviderNotFoundError"
)<{ providerName: string }> {}
