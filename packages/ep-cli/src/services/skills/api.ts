/**
 * Skills Service API
 *
 * Public interface for skills operations
 */

import type { PlatformError } from "@effect/platform/Error";
import { Effect } from "effect";
import {
    SkillNotFoundError,
    SkillsDirectoryNotFoundError,
} from "./errors.js";
import { Skills } from "./service.js";
import type {
    SkillContent,
    SkillMetadata,
    SkillStats,
    ValidationIssue
} from "./types.js";

/**
 * Skills service interface
 *
 * Note: These properties are defined without resource dependencies because
 * they are accessed through the Skills service context tag, which handles
 * the resource requirements. When used directly, callers should use the
 * standalone functions below which explicitly declare Skills as a dependency.
 */
export interface SkillsService {
  readonly listAll: Effect.Effect<
    readonly SkillMetadata[],
    SkillsDirectoryNotFoundError | PlatformError
  >;
  readonly getByCategory: (
    category: string
  ) => Effect.Effect<SkillContent, SkillNotFoundError | PlatformError>;
  readonly validate: (
    category: string
  ) => Effect.Effect<readonly ValidationIssue[], SkillNotFoundError | PlatformError>;
  readonly validateAll: Effect.Effect<
    readonly ValidationIssue[],
    SkillsDirectoryNotFoundError | SkillNotFoundError | PlatformError
  >;
  readonly getStats: Effect.Effect<
    SkillStats,
    SkillsDirectoryNotFoundError | PlatformError
  >;
}

/**
 * List all available skills
 */
export const listAll = (): Effect.Effect<
  readonly SkillMetadata[],
  SkillsDirectoryNotFoundError | PlatformError,
  Skills
> => Effect.gen(function* () {
  const skills = yield* Skills;
  return yield* skills.listAll;
});

/**
 * Get a skill by category
 */
export const getByCategory = (
  category: string
): Effect.Effect<SkillContent, SkillNotFoundError | PlatformError, Skills> =>
  Effect.gen(function* () {
    const skills = yield* Skills;
    return yield* skills.getByCategory(category);
  });

/**
 * Validate a single skill
 */
export const validate = (
  category: string
): Effect.Effect<
  readonly ValidationIssue[],
  SkillNotFoundError | PlatformError,
  Skills
> => Effect.gen(function* () {
  const skills = yield* Skills;
  return yield* skills.validate(category);
});

/**
 * Validate all skills
 */
export const validateAll = (): Effect.Effect<
  readonly ValidationIssue[],
  SkillsDirectoryNotFoundError | SkillNotFoundError | PlatformError,
  Skills
> => Effect.gen(function* () {
  const skills = yield* Skills;
  return yield* skills.validateAll;
});

/**
 * Get statistics about skills
 */
export const getStats = (): Effect.Effect<
  SkillStats,
  SkillsDirectoryNotFoundError | PlatformError,
  Skills
> => Effect.gen(function* () {
  const skills = yield* Skills;
  return yield* skills.getStats;
});
