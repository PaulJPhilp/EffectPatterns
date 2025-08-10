import { Data } from "effect";

export class InvalidMdxFormatError extends Data.TaggedError(
  "InvalidMdxFormatError"
)<{ reason: string }> {}

export class InvalidFrontmatterError extends Data.TaggedError(
  "InvalidFrontmatterError"
)<{ reason: string }> {}
