import { Data } from "effect";

// Error types for run management
export class RunManagementError extends Data.TaggedError("RunManagementError")<{
	readonly reason: string;
	readonly cause?: unknown;
}> { }