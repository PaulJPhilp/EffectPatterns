/**
 * Utility functions for Pattern repository
 */

import type { DbPatternRow, PatternMeta, SkillLevel } from './types.js';

/**
 * Map database row to PatternMeta domain type
 *
 * Note: modules field is left empty - the Catalog service will populate it
 */
export const toPatternMeta = (row: DbPatternRow): PatternMeta => ({
  id: row.id,
  title: row.title,
  summary: row.summary,
  skillLevel: row.skill_level as SkillLevel,
  tags: row.tags ?? [],
  related: row.related ?? undefined,
  author: row.author ?? undefined,
  slug: row.mdx_slug ?? undefined,
  contentPath: row.content_path ?? undefined,
  modules: {}, // Repository does not populate modules; Catalog service will
});
