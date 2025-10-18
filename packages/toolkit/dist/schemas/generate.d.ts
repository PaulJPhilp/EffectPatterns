/**
 * Generate Request/Response Schema Definitions
 *
 * Schemas for the code generation API endpoints, including request
 * validation and response format.
 */
import { Schema as S } from '@effect/schema';
/**
 * Module type for generated code
 */
export declare const ModuleType: S.Literal<["esm", "cjs"]>;
export type ModuleType = S.Schema.Type<typeof ModuleType>;
/**
 * Generate snippet request
 */
export declare const GenerateRequest: S.Struct<{
    patternId: typeof S.String;
    name: S.optional<typeof S.String>;
    input: S.optional<typeof S.String>;
    moduleType: S.optional<S.Literal<["esm", "cjs"]>>;
    effectVersion: S.optional<typeof S.String>;
}>;
export type GenerateRequest = S.Schema.Type<typeof GenerateRequest>;
/**
 * Generate snippet response
 */
export declare const GenerateResponse: S.Struct<{
    patternId: typeof S.String;
    title: typeof S.String;
    snippet: typeof S.String;
    traceId: S.optional<typeof S.String>;
    timestamp: typeof S.String;
}>;
export type GenerateResponse = S.Schema.Type<typeof GenerateResponse>;
/**
 * Search patterns request (query params)
 */
export declare const SearchPatternsRequest: S.Struct<{
    q: S.optional<typeof S.String>;
    category: S.optional<typeof S.String>;
    difficulty: S.optional<typeof S.String>;
    limit: S.optional<typeof S.NumberFromString>;
}>;
export type SearchPatternsRequest = S.Schema.Type<typeof SearchPatternsRequest>;
/**
 * Search patterns response
 */
export declare const SearchPatternsResponse: S.Struct<{
    count: typeof S.Number;
    patterns: S.Array$<S.Struct<{
        id: typeof S.String;
        title: typeof S.String;
        description: typeof S.String;
        category: typeof S.String;
        difficulty: typeof S.String;
        tags: S.Array$<typeof S.String>;
    }>>;
    traceId: S.optional<typeof S.String>;
}>;
export type SearchPatternsResponse = S.Schema.Type<typeof SearchPatternsResponse>;
/**
 * Explain pattern request
 */
export declare const ExplainPatternRequest: S.Struct<{
    patternId: typeof S.String;
}>;
export type ExplainPatternRequest = S.Schema.Type<typeof ExplainPatternRequest>;
//# sourceMappingURL=generate.d.ts.map