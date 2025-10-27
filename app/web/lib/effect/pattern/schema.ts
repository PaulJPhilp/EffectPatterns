/**
 * Effect schemas for Pattern repository
 */

import * as S from '@effect/schema/Schema';

export const SkillLevelSchema = S.Union(
  S.Literal('beginner'),
  S.Literal('intermediate'),
  S.Literal('advanced')
);

export const PatternFilterSchema = S.Struct({
  query: S.optional(S.String),
  tags: S.optional(S.Array(S.String)),
  skillLevel: S.optional(SkillLevelSchema),
});

export const PageParamsSchema = S.Struct({
  limit: S.optional(S.Number),
  offset: S.optional(S.Number),
});
