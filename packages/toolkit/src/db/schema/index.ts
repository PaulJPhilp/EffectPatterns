/**
 * Drizzle Schema Definitions
 *
 * PostgreSQL schema for Effect Patterns Hub data model:
 * - ApplicationPattern: High-level pattern categories
 * - EffectPattern: Concrete code examples
 * - PatternRelation: Related patterns linking
 * - Skill: Agent Skills (SKILL.md) generated from patterns
 * - SkillPattern: Many-to-many relationship between skills and patterns
 */

import { relations } from "drizzle-orm"
import {
    boolean,
    index,
    integer,
    jsonb,
    pgTable,
    primaryKey,
    text,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
} from "drizzle-orm/pg-core"

/**
 * Skill level enum values
 */
export const skillLevels = ["beginner", "intermediate", "advanced"] as const
export type SkillLevel = (typeof skillLevels)[number]

/**
 * Application Patterns table
 *
 * High-level domain classification representing a coherent approach
 * to solving a class of problems with Effect.
 */
export const applicationPatterns = pgTable(
  "application_patterns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description").notNull(),
    learningOrder: integer("learning_order").notNull(),
    effectModule: varchar("effect_module", { length: 100 }),
    subPatterns: jsonb("sub_patterns").$type<string[]>().default([]),
    validated: boolean("validated").default(false).notNull(),
    validatedAt: timestamp("validated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("application_patterns_slug_idx").on(table.slug),
    index("application_patterns_learning_order_idx").on(table.learningOrder),
    index("application_patterns_validated_idx").on(table.validated),
  ]
)

/**
 * Code example structure for JSONB storage
 */
export interface CodeExample {
  language: string
  code: string
  description?: string
}

/**
 * Rule structure for JSONB storage
 */
export interface PatternRule {
  description: string
}

/**
 * Effect Patterns table
 *
 * Concrete code examples demonstrating how to accomplish
 * a job using Effect.
 */
export const effectPatterns = pgTable(
  "effect_patterns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    title: varchar("title", { length: 500 }).notNull(),
    summary: text("summary").notNull(),
    skillLevel: varchar("skill_level", { length: 50 }).notNull().$type<SkillLevel>(),
    category: varchar("category", { length: 100 }),
    difficulty: varchar("difficulty", { length: 50 }),
    tags: jsonb("tags").$type<string[]>().default([]),
    examples: jsonb("examples").$type<CodeExample[]>().default([]),
    useCases: jsonb("use_cases").$type<string[]>().default([]),
    rule: jsonb("rule").$type<PatternRule>(),
    content: text("content"),
    author: varchar("author", { length: 255 }),
    lessonOrder: integer("lesson_order"),
    releaseVersion: varchar("release_version", { length: 20 }),
    applicationPatternId: uuid("application_pattern_id").references(
      () => applicationPatterns.id,
      { onDelete: "set null" }
    ),
    validated: boolean("validated").default(false).notNull(),
    validatedAt: timestamp("validated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("effect_patterns_slug_idx").on(table.slug),
    index("effect_patterns_skill_level_idx").on(table.skillLevel),
    index("effect_patterns_category_idx").on(table.category),
    index("effect_patterns_application_pattern_idx").on(table.applicationPatternId),
    index("effect_patterns_validated_idx").on(table.validated),
    index("effect_patterns_tags_idx").using("gin", table.tags), // Optimize tag search
  ]
)

/**
 * Pattern Relations table
 *
 * Self-referential many-to-many for related patterns.
 */
export const patternRelations = pgTable(
  "pattern_relations",
  {
    patternId: uuid("pattern_id")
      .notNull()
      .references(() => effectPatterns.id, { onDelete: "cascade" }),
    relatedPatternId: uuid("related_pattern_id")
      .notNull()
      .references(() => effectPatterns.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.patternId, table.relatedPatternId] }),
    index("pattern_relations_pattern_idx").on(table.patternId),
    index("pattern_relations_related_idx").on(table.relatedPatternId),
  ]
)

/**
 * Skills table
 *
 * Agent Skills (SKILL.md format) generated from patterns.
 * Each skill packages a set of patterns into a deployable agent capability.
 */
export const skills = pgTable(
  "skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description").notNull(),
    category: varchar("category", { length: 100 }),
    content: text("content"),
    version: integer("version").notNull().default(1),
    patternCount: integer("pattern_count").notNull().default(0),
    applicationPatternId: uuid("application_pattern_id").references(
      () => applicationPatterns.id,
      { onDelete: "set null" }
    ),
    validated: boolean("validated").default(false).notNull(),
    validatedAt: timestamp("validated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("skills_slug_idx").on(table.slug),
    index("skills_category_idx").on(table.category),
    index("skills_application_pattern_idx").on(table.applicationPatternId),
    index("skills_validated_idx").on(table.validated),
  ]
)

/**
 * Skill-Pattern join table
 *
 * Many-to-many relationship: Skills are composed of multiple patterns.
 */
export const skillPatterns = pgTable(
  "skill_patterns",
  {
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    patternId: uuid("pattern_id")
      .notNull()
      .references(() => effectPatterns.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.skillId, table.patternId] }),
    index("skill_patterns_skill_idx").on(table.skillId),
    index("skill_patterns_pattern_idx").on(table.patternId),
  ]
)

// ============================================
// Drizzle Relations
// ============================================

/**
 * Application Pattern relations
 */
export const applicationPatternRelations = relations(applicationPatterns, ({ many }) => ({
  effectPatterns: many(effectPatterns),
  skills: many(skills),
}))

/**
 * Effect Pattern relations
 */
export const effectPatternRelations = relations(effectPatterns, ({ one, many }) => ({
  applicationPattern: one(applicationPatterns, {
    fields: [effectPatterns.applicationPatternId],
    references: [applicationPatterns.id],
  }),
  skillPatterns: many(skillPatterns),
  relatedFrom: many(patternRelations, { relationName: "relatedFrom" }),
  relatedTo: many(patternRelations, { relationName: "relatedTo" }),
}))

/**
 * PatternRelation relations
 */
export const patternRelationRelations = relations(patternRelations, ({ one }) => ({
  pattern: one(effectPatterns, {
    fields: [patternRelations.patternId],
    references: [effectPatterns.id],
    relationName: "relatedFrom",
  }),
  relatedPattern: one(effectPatterns, {
    fields: [patternRelations.relatedPatternId],
    references: [effectPatterns.id],
    relationName: "relatedTo",
  }),
}))

/**
 * Skill relations
 */
export const skillRelations = relations(skills, ({ one, many }) => ({
  applicationPattern: one(applicationPatterns, {
    fields: [skills.applicationPatternId],
    references: [applicationPatterns.id],
  }),
  skillPatterns: many(skillPatterns),
}))

/**
 * SkillPattern relations
 */
export const skillPatternRelations = relations(skillPatterns, ({ one }) => ({
  skill: one(skills, {
    fields: [skillPatterns.skillId],
    references: [skills.id],
  }),
  pattern: one(effectPatterns, {
    fields: [skillPatterns.patternId],
    references: [effectPatterns.id],
  }),
}))

// ============================================
// Type Exports
// ============================================

export type ApplicationPattern = typeof applicationPatterns.$inferSelect
export type NewApplicationPattern = typeof applicationPatterns.$inferInsert

export type EffectPattern = typeof effectPatterns.$inferSelect
export type NewEffectPattern = typeof effectPatterns.$inferInsert

export type PatternRelation = typeof patternRelations.$inferSelect
export type NewPatternRelation = typeof patternRelations.$inferInsert

export type Skill = typeof skills.$inferSelect
export type NewSkill = typeof skills.$inferInsert

export type SkillPattern = typeof skillPatterns.$inferSelect
export type NewSkillPattern = typeof skillPatterns.$inferInsert

