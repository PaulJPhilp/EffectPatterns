import { Data } from "effect";

export class ConfigParseError extends Data.TaggedError(
	"ConfigParseError"
)<{
	readonly message: string;
	readonly cause?: unknown;
}> { }
