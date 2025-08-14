import { Effect } from "effect";
/**
 * Test utilities for LLM service tests
 */
export interface TestResult<T> {
    success: boolean;
    data?: T;
    error?: Error;
}
/**
 * Helper to run Effect and return structured result
 */
export declare function runTest<T>(effect: Effect.Effect<T, Error>): Promise<TestResult<T>>;
/**
 * Helper to run Effect with Either wrapper
 */
export declare function runTestEither<T>(effect: Effect.Effect<T, Error>): Promise<import("effect/Either").Either<T, Error>>;
/**
 * Test data generators
 */
export declare const testData: {
    validMdx: (provider: string, model: string, content?: string) => string;
    invalidMdx: {
        noFrontmatter: string;
        invalidYaml: string;
        missingFields: string;
    };
    schemas: {
        simpleObject: {
            type: string;
            properties: {
                name: {
                    type: string;
                };
                age: {
                    type: string;
                };
            };
            required: string[];
        };
        complexObject: {
            type: string;
            properties: {
                user: {
                    type: string;
                    properties: {
                        name: {
                            type: string;
                        };
                        email: {
                            type: string;
                        };
                    };
                    required: string[];
                };
                metadata: {
                    type: string;
                    properties: {
                        created: {
                            type: string;
                        };
                        version: {
                            type: string;
                        };
                    };
                };
            };
            required: string[];
        };
    };
    prompts: {
        simple: string;
        complex: string;
        code: string;
        empty: string;
        special: string;
    };
};
/**
 * Test configuration
 */
export declare const testConfig: {
    timeout: number;
    retryAttempts: number;
    providers: {
        google: {
            name: "google";
            models: readonly ["gemini-2.0-flash", "gemini-2.5-flash"];
        };
        openai: {
            name: "openai";
            models: readonly ["gpt-4o-mini", "gpt-3.5-turbo"];
        };
        anthropic: {
            name: "anthropic";
            models: readonly ["claude-3-haiku", "claude-3-sonnet"];
        };
    };
};
/**
 * Helper to create test MDX files
 */
export declare function createTestMdx(config: {
    provider: string;
    model: string;
    parameters?: Record<string, unknown>;
    content?: string;
}): string;
/**
 * Error matchers
 */
export declare const errorMatchers: {
    isInvalidMdxFormatError: (error: unknown) => boolean;
    isInvalidFrontmatterError: (error: unknown) => boolean;
    isUnsupportedProviderError: (error: unknown) => boolean;
    isAiError: (error: unknown) => boolean;
};
//# sourceMappingURL=test-helpers.d.ts.map