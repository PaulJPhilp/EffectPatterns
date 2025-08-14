import { Data } from "effect";

// Error class
export class MetricsError extends Data.Error<{
	readonly message: string;
	readonly cause?: unknown;
}> { }