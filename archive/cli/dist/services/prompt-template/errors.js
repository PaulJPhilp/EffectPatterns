import { Data } from "effect";
export class UnsupportedTemplateFileError extends Data.TaggedError("UnsupportedTemplateFileError") {
}
export class InvalidParameterTypeError extends Data.TaggedError("InvalidParameterTypeError") {
}
export class MissingParametersError extends Data.TaggedError("MissingParametersError") {
}
export class UnknownParametersError extends Data.TaggedError("UnknownParametersError") {
}
export class TemplateRenderError extends Data.TaggedError("TemplateRenderError") {
}
//# sourceMappingURL=errors.js.map