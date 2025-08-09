import { Data } from "effect";
// Error types
export class InvalidMdxFormatError extends Data.TaggedError("InvalidMdxFormatError") {
}
export class InvalidFrontmatterError extends Data.TaggedError("InvalidFrontmatterError") {
}
