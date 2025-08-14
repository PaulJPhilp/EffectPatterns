import { Data } from "effect";
export class PlanError_InvalidRetries extends Data.TaggedError("PlanError_InvalidRetries") {
}
export class PlanError_InvalidRetryMs extends Data.TaggedError("PlanError_InvalidRetryMs") {
}
export class PlanError_InvalidFallbackSpec extends Data.TaggedError("PlanError_InvalidFallbackSpec") {
}
export class GenerateError_SchemaPromptRequired extends Data.TaggedError("GenerateError_SchemaPromptRequired") {
}
export class GenerateError_InvalidJson extends Data.TaggedError("GenerateError_InvalidJson") {
}
export class GenerateError_NoJsonFound extends Data.TaggedError("GenerateError_NoJsonFound") {
}
export class GenerateError_MissingInput extends Data.TaggedError("GenerateError_MissingInput") {
}
export class DryRunError_MissingInput extends Data.TaggedError("DryRunError_MissingInput") {
}
//# sourceMappingURL=errors.js.map