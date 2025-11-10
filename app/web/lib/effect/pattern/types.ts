/**
 * Domain types for Pattern repository
 */

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export type PatternID = string;

/**
 * Pattern metadata - the canonical domain type
 */
export interface PatternMeta {
  id: PatternID;
  title: string;
  summary: string;
  skillLevel: SkillLevel;
  tags: string[];
  related?: string[];
  author?: string;
  slug?: string;
  contentPath?: string;
  modules?: Record<string, ModulePlacement>;
}

/**
 * Module placement info (populated by Catalog service, not repository)
 */
export interface ModulePlacement {
  stage?: number | null;
  position: number;
}

/**
 * Database row shape from Drizzle
 */
export interface DbPatternRow {
  id: string;
  title: string;
  summary: string;
  skill_level: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  related: string[] | null;
  author: string | null;
  mdx_slug: string;
  content_path: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Filter for pattern search
 */
export interface PatternFilter {
  query?: string;
  tags?: string[];
  skillLevel?: SkillLevel;
}

/**
 * Pagination parameters
 */
export interface PageParams {
  limit?: number;
  offset?: number;
}

/**
 * Paginated result
 */
export interface PageResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
