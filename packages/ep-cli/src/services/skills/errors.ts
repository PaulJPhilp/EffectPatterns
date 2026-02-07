/**
 * Errors for Skills Service
 */

import { Data } from "effect";

export class SkillNotFoundError extends Data.TaggedError("SkillNotFoundError")<{
  readonly category: string;
}> {}

export class SkillsDirectoryNotFoundError extends Data.TaggedError("SkillsDirectoryNotFoundError")<{
  readonly path: string;
}> {}
