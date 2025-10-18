/**
 * Database schema for Effect Patterns Hub
 *
 * Using Drizzle ORM with Postgres
 */

import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

/**
 * Skill level enum
 */
export const skillLevels = ['beginner', 'intermediate', 'advanced'] as const;
export type SkillLevel = (typeof skillLevels)[number];

/**
 * Patterns table
 *
 * Stores pattern metadata from MDX frontmatter.
 * Does NOT include module placement (see pattern_module_placements).
 */
export const patterns = pgTable(
  'patterns',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    skillLevel: text('skill_level').notNull().$type<SkillLevel>(),
    tags: text('tags').array().notNull().default([]),
    useCase: text('use_case').array(),
    related: text('related').array().notNull().default([]),
    author: text('author'),
    mdxSlug: text('mdx_slug').notNull(),
    contentPath: text('content_path').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    titleIdx: index('patterns_title_idx').on(table.title),
    skillLevelIdx: index('patterns_skill_level_idx').on(table.skillLevel),
    tagsIdx: index('patterns_tags_idx').on(table.tags),
  })
);

/**
 * Module IDs enum
 */
export const moduleIds = [
  'module-1-foundations',
  'module-2-web-api',
  'module-3-data-pipelines',
  'module-4-scope-layer',
  'module-5-combinators',
  'module-6-constructors',
  'module-7-pattern-matching',
  'module-8-branded-types',
  'module-9-observability',
  'module-10-data-types',
] as const;
export type ModuleId = (typeof moduleIds)[number];

/**
 * Pattern Module Placements table
 *
 * Maps patterns to modules with stage and position.
 * Source of truth: roadmap MDX files.
 */
export const patternModulePlacements = pgTable(
  'pattern_module_placements',
  {
    id: text('id').primaryKey(),
    patternId: text('pattern_id')
      .notNull()
      .references(() => patterns.id, { onDelete: 'cascade' }),
    moduleId: text('module_id').notNull().$type<ModuleId>(),
    stage: integer('stage'),
    position: integer('position').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    patternIdIdx: index('placements_pattern_id_idx').on(table.patternId),
    moduleIdIdx: index('placements_module_id_idx').on(table.moduleId),
    moduleStageIdx: index('placements_module_stage_idx').on(
      table.moduleId,
      table.stage
    ),
    uniquePlacement: unique('placements_pattern_module_unique').on(
      table.patternId,
      table.moduleId
    ),
  })
);

/**
 * Users table
 *
 * Stores user profile and subscription tier.
 * Synced with Clerk for auth.
 */
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email').notNull().unique(),
  tier: text('tier')
    .notNull()
    .default('free')
    .$type<'free' | 'pro' | 'enterprise'>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Learning Plans table
 *
 * Stores AI-generated personalized learning plans.
 */
export const learningPlans = pgTable('learning_plans', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  goal: text('goal').notNull(),
  phases: jsonb('phases').notNull().$type<
    Array<{
      title: string;
      patternIds: string[];
      rationale: string;
      estimatedDuration?: string;
    }>
  >(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Pattern Progress table
 *
 * Tracks user progress through patterns.
 * Synced with Convex for real-time updates.
 */
export const patternProgress = pgTable(
  'pattern_progress',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    patternId: text('pattern_id')
      .notNull()
      .references(() => patterns.id, { onDelete: 'cascade' }),
    status: text('status')
      .notNull()
      .default('not_started')
      .$type<'not_started' | 'reading' | 'completed'>(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('progress_user_id_idx').on(table.userId),
    patternIdIdx: index('progress_pattern_id_idx').on(table.patternId),
    uniqueProgress: unique('progress_user_pattern_unique').on(
      table.userId,
      table.patternId
    ),
  })
);

// Type exports for use in application code
export type Pattern = typeof patterns.$inferSelect;
export type NewPattern = typeof patterns.$inferInsert;
export type PatternModulePlacement =
  typeof patternModulePlacements.$inferSelect;
export type NewPatternModulePlacement =
  typeof patternModulePlacements.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type LearningPlan = typeof learningPlans.$inferSelect;
export type NewLearningPlan = typeof learningPlans.$inferInsert;
export type PatternProgress = typeof patternProgress.$inferSelect;
export type NewPatternProgress = typeof patternProgress.$inferInsert;
