import { Data } from "effect";
export class InvalidMdxFormatError extends Data.TaggedError("InvalidMdxFormatError") {
}
export class InvalidFrontmatterError extends Data.TaggedError("InvalidFrontmatterError") {
}
