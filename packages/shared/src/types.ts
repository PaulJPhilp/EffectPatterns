/**
 * Shared types for the Wetware Software monorepo
 */

export type FocusArea =
  | "Human-Centric"
  | "Tech-Centric"
  | "Human-AI Collaboration"
  | "Coding"
  | "Business of AI";

export type ContentType = "Essay" | "Article" | "Resource" | "Project";

export type SeriesStatus = "Active" | "Completed" | "Draft";

/**
 * Base Notion client configuration
 */
export interface NotionConfig {
  apiKey: string;
  blogPostsDatabaseId: string;
  seriesDatabaseId: string;
  resourcesDatabaseId?: string;
}

/**
 * Series data structure used across web and CLI
 */
export interface Series {
  id: string;
  name: string;
  slug: string;
  description: string;
  seriesGoal: string;
  status: SeriesStatus;
  focusArea: FocusArea;
  tags: { name: string; color: string }[];
  coverLight?: string;
  coverDark?: string;
  postCount: number;
  publishedDate?: string;
}

/**
 * Post/Article data structure
 */
export interface Post {
  id: string;
  name: string;
  slug: string;
  publishDate: string;
  type: ContentType;
  focusArea: FocusArea;
  description: string;
  tags: { name: string; color: string }[];
  readTime: number;
  featured: boolean;
  // Series-related fields
  seriesId?: string;
  seriesName?: string;
  partNumber?: number;
  // External links
  githubLink?: string;
  demoLink?: string;
  sourceLink?: string;
  // Resource-specific
  curatorsNote?: string;
  customIcon?: string;
  // Cover image
  coverImage?: string;
  // About page specific fields
  skills?: string[];
  currentFocus?: string[];
  blogTopics?: string[];
}

/**
 * Resource data structure for CLI
 */
export interface Resource {
  id: string;
  url?: string;
  name: string;
  type?: string | null;
  sourceEntityName?: string | null;
  icon?: string | null;
  curatorNote?: string | null;
  focusArea?: string[];
  tags?: string[];
  readTimeMinutes?: number | null;
  seriesName?: string | null;
}

/**
 * Source Entity data structure for CLI
 */
export interface SourceEntity {
  id: string;
  url?: string;
  name: string;
  type?: string | null;
  description?: string | null;
  endorsement?: string | null;
  focusArea?: string[];
}
