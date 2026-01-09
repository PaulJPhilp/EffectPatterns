/**
 * Errors for Skills Service
 */

import { Data } from "effect";

export class SkillNotFoundError extends Data.TaggedError("SkillNotFoundError")<{
	readonly category: string;
}> { }

export class SkillValidationError extends Data.TaggedError("SkillValidationError")<{
	readonly category: string;
	readonly filePath: string;
	readonly message: string;
}> { }

export class SkillsDirectoryNotFoundError extends Data.TaggedError("SkillsDirectoryNotFoundError")<{
	readonly path: string;
}> { }
