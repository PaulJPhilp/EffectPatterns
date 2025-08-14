import { Data } from "effect";

export class ConfigError extends Data.TaggedError("ConfigError")<{
	readonly message: string;
	readonly cause?: unknown;
}> { }