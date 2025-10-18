/**
 * Pattern Schema Definitions using @effect/schema
 *
 * Canonical domain types for Effect patterns, including full Pattern
 * representation and PatternSummary for list views.
 */
import { Schema as S } from '@effect/schema';
/**
 * Pattern category enumeration
 */
export declare const PatternCategory: S.Literal<["error-handling", "concurrency", "data-transformation", "testing", "services", "streams", "caching", "observability", "scheduling", "resource-management"]>;
export type PatternCategory = S.Schema.Type<typeof PatternCategory>;
/**
 * Pattern difficulty level
 */
export declare const DifficultyLevel: S.Literal<["beginner", "intermediate", "advanced"]>;
export type DifficultyLevel = S.Schema.Type<typeof DifficultyLevel>;
/**
 * Code example schema
 */
export declare const CodeExample: S.Struct<{
    language: typeof S.String;
    code: typeof S.String;
    description: S.optional<typeof S.String>;
}>;
export type CodeExample = S.Schema.Type<typeof CodeExample>;
/**
 * Full Pattern schema with all metadata and content
 */
export declare const Pattern: S.Struct<{
    id: typeof S.String;
    title: typeof S.String;
    description: typeof S.String;
    category: S.Literal<["error-handling", "concurrency", "data-transformation", "testing", "services", "streams", "caching", "observability", "scheduling", "resource-management"]>;
    difficulty: S.Literal<["beginner", "intermediate", "advanced"]>;
    tags: S.Array$<typeof S.String>;
    examples: S.Array$<S.Struct<{
        language: typeof S.String;
        code: typeof S.String;
        description: S.optional<typeof S.String>;
    }>>;
    useCases: S.Array$<typeof S.String>;
    relatedPatterns: S.optional<S.Array$<typeof S.String>>;
    effectVersion: S.optional<typeof S.String>;
    createdAt: S.optional<typeof S.String>;
    updatedAt: S.optional<typeof S.String>;
}>;
export type Pattern = S.Schema.Type<typeof Pattern>;
/**
 * Pattern summary for list views (lighter weight)
 */
export declare const PatternSummary: S.Struct<{
    id: typeof S.String;
    title: typeof S.String;
    description: typeof S.String;
    category: S.Literal<["error-handling", "concurrency", "data-transformation", "testing", "services", "streams", "caching", "observability", "scheduling", "resource-management"]>;
    difficulty: S.Literal<["beginner", "intermediate", "advanced"]>;
    tags: S.Array$<typeof S.String>;
}>;
export type PatternSummary = S.Schema.Type<typeof PatternSummary>;
/**
 * Patterns index (loaded from patterns.json)
 */
export declare const PatternsIndex: S.Struct<{
    version: S.optional<typeof S.String>;
    patterns: S.Array$<S.Struct<{
        id: typeof S.String;
        title: typeof S.String;
        description: typeof S.String;
        category: S.Literal<["error-handling", "concurrency", "data-transformation", "testing", "services", "streams", "caching", "observability", "scheduling", "resource-management"]>;
        difficulty: S.Literal<["beginner", "intermediate", "advanced"]>;
        tags: S.Array$<typeof S.String>;
        examples: S.Array$<S.Struct<{
            language: typeof S.String;
            code: typeof S.String;
            description: S.optional<typeof S.String>;
        }>>;
        useCases: S.Array$<typeof S.String>;
        relatedPatterns: S.optional<S.Array$<typeof S.String>>;
        effectVersion: S.optional<typeof S.String>;
        createdAt: S.optional<typeof S.String>;
        updatedAt: S.optional<typeof S.String>;
    }>>;
    lastUpdated: S.optional<typeof S.String>;
}>;
export type PatternsIndex = S.Schema.Type<typeof PatternsIndex>;
//# sourceMappingURL=pattern.d.ts.map