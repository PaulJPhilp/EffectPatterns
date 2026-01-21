import { Data } from "effect";

/**
 * Validation error types
 */
export class FileSizeError extends Data.TaggedError("FileSizeError")<{
	readonly size: number;
	readonly maxSize: number;
}> {
	get message() {
		return `File size ${this.size} bytes exceeds maximum of ${this.maxSize} bytes`;
	}
}

export class NonTypeScriptError extends Data.TaggedError("NonTypeScriptError")<{
	readonly filePath: string;
}> {
	get message() {
		return `File ${this.filePath} is not a TypeScript file. Only .ts and .tsx files are supported.`;
	}
}
