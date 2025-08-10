import { Data } from "effect";
export class ModelNotFoundError extends Data.TaggedError("ModelNotFoundError") {
}
export class ProviderNotFoundError extends Data.TaggedError("ProviderNotFoundError") {
}
