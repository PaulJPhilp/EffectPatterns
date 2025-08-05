import { Effect } from "effect";
/**
 * Helper to run Effect and return structured result
 */
export async function runTest(effect) {
    try {
        const result = await Effect.runPromise(effect);
        return { success: true, data: result };
    }
    catch (error) {
        return { success: false, error: error };
    }
}
/**
 * Helper to run Effect with Either wrapper
 */
export async function runTestEither(effect) {
    return Effect.runPromise(Effect.either(effect));
}
/**
 * Test data generators
 */
export const testData = {
    validMdx: (provider, model, content = "Test content") => `
---
provider: ${provider}
model: ${model}
---

${content}
  `,
    invalidMdx: {
        noFrontmatter: "# No frontmatter\nThis has no frontmatter.",
        invalidYaml: `
---
invalid: yaml: content: here
---

# Content
    `,
        missingFields: `
---
title: Test
---

# Content
    `
    },
    schemas: {
        simpleObject: {
            type: "object",
            properties: {
                name: { type: "string" },
                age: { type: "number" }
            },
            required: ["name", "age"]
        },
        complexObject: {
            type: "object",
            properties: {
                user: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        email: { type: "string" }
                    },
                    required: ["name"]
                },
                metadata: {
                    type: "object",
                    properties: {
                        created: { type: "string" },
                        version: { type: "number" }
                    }
                }
            },
            required: ["user"]
        }
    },
    prompts: {
        simple: "Hello, world!",
        complex: "Generate a comprehensive analysis of modern web development practices",
        code: "Write a TypeScript function to calculate fibonacci numbers",
        empty: "",
        special: "Text with émojis 🎉 and special chars: @#$%^&*()"
    }
};
/**
 * Test configuration
 */
export const testConfig = {
    timeout: 30000, // 30 seconds for API calls
    retryAttempts: 3,
    providers: {
        google: {
            name: "google",
            models: ["gemini-2.0-flash", "gemini-2.5-flash"]
        },
        openai: {
            name: "openai",
            models: ["gpt-4o-mini", "gpt-3.5-turbo"]
        },
        anthropic: {
            name: "anthropic",
            models: ["claude-3-haiku", "claude-3-sonnet"]
        }
    }
};
/**
 * Helper to create test MDX files
 */
export function createTestMdx(config) {
    const frontmatter = {
        provider: config.provider,
        model: config.model,
        ...(config.parameters && { parameters: config.parameters })
    };
    return `---
${Object.entries(frontmatter)
        .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
        .join('\n')}
---

${config.content || "Test content"}`;
}
/**
 * Error matchers
 */
export const errorMatchers = {
    isInvalidMdxFormatError: (error) => error._tag === "InvalidMdxFormatError",
    isInvalidFrontmatterError: (error) => error._tag === "InvalidFrontmatterError",
    isUnsupportedProviderError: (error) => error._tag === "UnsupportedProviderError",
    isAiError: (error) => error._tag === "AiError"
};
