import { Data } from "effect";

export class OutputHandlerError extends Data.TaggedError<"OutputHandlerError">("OutputHandlerError") {
	readonly message: string;
	readonly cause?: unknown;

	constructor(message: string, cause?: unknown) {
		super();
		this.message = message;
		this.cause = cause;
	}
}