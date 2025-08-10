import { Data } from "effect";

export class UnsupportedTemplateFileError extends Data.TaggedError(
  "UnsupportedTemplateFileError"
)<{
  reason: string;
}> {}

export class InvalidParameterTypeError extends Data.TaggedError(
  "InvalidParameterTypeError"
)<{
  param?: string;
  expected: string;
  got: string;
}> {}

export class MissingParametersError extends Data.TaggedError(
  "MissingParametersError"
)<{
  params: string[];
}> {}

export class UnknownParametersError extends Data.TaggedError(
  "UnknownParametersError"
)<{
  params: string[];
}> {}

export class TemplateRenderError extends Data.TaggedError(
  "TemplateRenderError"
)<{
  reason: string;
}> {}

