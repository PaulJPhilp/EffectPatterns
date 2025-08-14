import { Effect } from "effect";
import { describe, test, expect } from "vitest";

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
export async function runTest<T>(effect: Effect.Effect<T, Error>): Promise<TestResult<T>> {
  try {
    const result = await Effect.runPromise(effect);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

/**
 * Helper to run Effect with Either wrapper
 */
export async function runTestEither<T>(effect: Effect.Effect<T, Error>) {
  return Effect.runPromise(Effect.either(effect));
}

/**
 * Test data generators
 */
export const testData = {
  validMdx: (provider: string, model: string, content: string = "Test content") => `
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
      name: "google" as const,
      models: ["gemini-2.0-flash", "gemini-2.5-flash"] as const
    },
    openai: {
      name: "openai" as const,
      models: ["gpt-4o-mini", "gpt-3.5-turbo"] as const
    },
    anthropic: {
      name: "anthropic" as const,
      models: ["claude-3-haiku", "claude-3-sonnet"] as const
    }
  }
};

/**
 * Helper to create test MDX files
 */
export function createTestMdx(config: {
  provider: string;
  model: string;
  parameters?: Record<string, unknown>;
  content?: string;
}) {
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
  isInvalidMdxFormatError: (error: unknown) =>
    typeof error === "object" && error !== null &&
    "_tag" in (error as Record<string, unknown>) &&
    (error as { _tag?: unknown })._tag === "InvalidMdxFormatError",
  isInvalidFrontmatterError: (error: unknown) =>
    typeof error === "object" && error !== null &&
    "_tag" in (error as Record<string, unknown>) &&
    (error as { _tag?: unknown })._tag === "InvalidFrontmatterError",
  isUnsupportedProviderError: (error: unknown) =>
    typeof error === "object" && error !== null &&
    "_tag" in (error as Record<string, unknown>) &&
    (error as { _tag?: unknown })._tag === "UnsupportedProviderError",
  isAiError: (error: unknown) =>
    typeof error === "object" && error !== null &&
    "_tag" in (error as Record<string, unknown>) &&
    (error as { _tag?: unknown })._tag === "AiError"
};
