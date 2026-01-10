/**
 * Drizzle Schema Definitions
 *
 * PostgreSQL schema for Effect Patterns Hub data model:
 * - ApplicationPattern: High-level pattern categories
 * - EffectPattern: Concrete code examples
 * - Job: Jobs-to-be-Done entries
 * - PatternJob: Many-to-many relationship between patterns and jobs
 * - PatternRelation: Related patterns linking
 */
import { pgTable, uuid, varchar, text, integer, timestamp, boolean, jsonb, primaryKey, index, uniqueIndex, } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
/**
 * Skill level enum values
 */
export const skillLevels = ["beginner", "intermediate", "advanced"];
/**
 * Job status enum values
 */
export const jobStatuses = ["covered", "partial", "gap"];
/**
 * Application Patterns table
 *
 * High-level domain classification representing a coherent approach
 * to solving a class of problems with Effect.
 */
export const applicationPatterns = pgTable("application_patterns", {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description").notNull(),
    learningOrder: integer("learning_order").notNull(),
    effectModule: varchar("effect_module", { length: 100 }),
    subPatterns: jsonb("sub_patterns").$type().default([]),
    validated: boolean("validated").default(false).notNull(),
    validatedAt: timestamp("validated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
    uniqueIndex("application_patterns_slug_idx").on(table.slug),
    index("application_patterns_learning_order_idx").on(table.learningOrder),
    index("application_patterns_validated_idx").on(table.validated),
]);
/**
 * Effect Patterns table
 *
 * Concrete code examples demonstrating how to accomplish
 * a job using Effect.
 */
export const effectPatterns = pgTable("effect_patterns", {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    title: varchar("title", { length: 500 }).notNull(),
    summary: text("summary").notNull(),
    skillLevel: varchar("skill_level", { length: 50 }).notNull().$type(),
    category: varchar("category", { length: 100 }),
    difficulty: varchar("difficulty", { length: 50 }),
    tags: jsonb("tags").$type().default([]),
    examples: jsonb("examples").$type().default([]),
    useCases: jsonb("use_cases").$type().default([]),
    rule: jsonb("rule").$type(),
    content: text("content"),
    author: varchar("author", { length: 255 }),
    lessonOrder: integer("lesson_order"),
    applicationPatternId: uuid("application_pattern_id").references(() => applicationPatterns.id, { onDelete: "set null" }),
    validated: boolean("validated").default(false).notNull(),
    validatedAt: timestamp("validated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
    uniqueIndex("effect_patterns_slug_idx").on(table.slug),
    index("effect_patterns_skill_level_idx").on(table.skillLevel),
    index("effect_patterns_category_idx").on(table.category),
    index("effect_patterns_application_pattern_idx").on(table.applicationPatternId),
    index("effect_patterns_validated_idx").on(table.validated),
]);
/**
 * Jobs table
 *
 * Represents a specific developer need or task within
 * an Application Pattern domain.
 */
export const jobs = pgTable("jobs", {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description").notNull(),
    category: varchar("category", { length: 100 }),
    status: varchar("status", { length: 50 }).notNull().$type(),
    applicationPatternId: uuid("application_pattern_id").references(() => applicationPatterns.id, { onDelete: "cascade" }),
    validated: boolean("validated").default(false).notNull(),
    validatedAt: timestamp("validated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
    uniqueIndex("jobs_slug_idx").on(table.slug),
    index("jobs_status_idx").on(table.status),
    index("jobs_application_pattern_idx").on(table.applicationPatternId),
    index("jobs_validated_idx").on(table.validated),
]);
/**
 * Pattern-Job join table
 *
 * Many-to-many relationship: Jobs can be fulfilled by multiple patterns.
 */
export const patternJobs = pgTable("pattern_jobs", {
    patternId: uuid("pattern_id")
        .notNull()
        .references(() => effectPatterns.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
        .notNull()
        .references(() => jobs.id, { onDelete: "cascade" }),
}, (table) => [
    primaryKey({ columns: [table.patternId, table.jobId] }),
    index("pattern_jobs_pattern_idx").on(table.patternId),
    index("pattern_jobs_job_idx").on(table.jobId),
]);
/**
 * Pattern Relations table
 *
 * Self-referential many-to-many for related patterns.
 */
export const patternRelations = pgTable("pattern_relations", {
    patternId: uuid("pattern_id")
        .notNull()
        .references(() => effectPatterns.id, { onDelete: "cascade" }),
    relatedPatternId: uuid("related_pattern_id")
        .notNull()
        .references(() => effectPatterns.id, { onDelete: "cascade" }),
}, (table) => [
    primaryKey({ columns: [table.patternId, table.relatedPatternId] }),
    index("pattern_relations_pattern_idx").on(table.patternId),
    index("pattern_relations_related_idx").on(table.relatedPatternId),
]);
// ============================================
// Drizzle Relations
// ============================================
/**
 * Application Pattern relations
 */
export const applicationPatternRelations = relations(applicationPatterns, ({ many }) => ({
    effectPatterns: many(effectPatterns),
    jobs: many(jobs),
}));
/**
 * Effect Pattern relations
 */
export const effectPatternRelations = relations(effectPatterns, ({ one, many }) => ({
    applicationPattern: one(applicationPatterns, {
        fields: [effectPatterns.applicationPatternId],
        references: [applicationPatterns.id],
    }),
    patternJobs: many(patternJobs),
    relatedFrom: many(patternRelations, { relationName: "relatedFrom" }),
    relatedTo: many(patternRelations, { relationName: "relatedTo" }),
}));
/**
 * Job relations
 */
export const jobRelations = relations(jobs, ({ one, many }) => ({
    applicationPattern: one(applicationPatterns, {
        fields: [jobs.applicationPatternId],
        references: [applicationPatterns.id],
    }),
    patternJobs: many(patternJobs),
}));
/**
 * PatternJob relations
 */
export const patternJobRelations = relations(patternJobs, ({ one }) => ({
    pattern: one(effectPatterns, {
        fields: [patternJobs.patternId],
        references: [effectPatterns.id],
    }),
    job: one(jobs, {
        fields: [patternJobs.jobId],
        references: [jobs.id],
    }),
}));
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
}));
//# sourceMappingURL=index.js.map