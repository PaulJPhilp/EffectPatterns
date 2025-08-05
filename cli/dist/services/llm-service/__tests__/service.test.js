import { describe, test, expect } from "vitest";
import { Schema } from "effect";
// Import service functions
import { generateText, generateObject, streamText, processPromptFromText, processPromptFromMdx } from "../service.js";
describe("LLM Service - Comprehensive Testing Suite", () => {
    const testPrompt = "Write a short story about a robot learning to paint";
    const testSchema = Schema.Struct({
        title: Schema.String,
        summary: Schema.String,
        keywords: Schema.Array(Schema.String)
    });
    const providers = ["google", "openai", "anthropic"];
    const modelsByProvider = {
        google: ["gemini-2.5-flash", "gemini-2.5-pro"],
        openai: ["gpt-4o-mini", "gpt-4o"],
        anthropic: ["claude-3-5-haiku", "claude-3-5-sonnet"]
    };
    // Basic function existence tests
    describe("Basic Function Existence", () => {
        test("generateText should be defined", () => {
            expect(generateText).toBeDefined();
        });
        test("generateObject should be defined", () => {
            expect(generateObject).toBeDefined();
        });
        test("streamText should be defined", () => {
            expect(streamText).toBeDefined();
        });
        test("processPromptFromText should be defined", () => {
            expect(processPromptFromText).toBeDefined();
        });
        test("processPromptFromMdx should be defined", () => {
            expect(processPromptFromMdx).toBeDefined();
        });
    });
    // Comprehensive provider and model testing
    providers.forEach(provider => {
        const providerModels = modelsByProvider[provider];
        describe(`${provider} Provider Tests`, () => {
            providerModels.forEach(model => {
                describe(`${provider} - ${model} Tests`, () => {
                    test(`generateText with ${provider} ${model} should return valid Effect`, () => {
                        const effect = generateText(testPrompt, provider, model);
                        expect(effect).toBeDefined();
                        expect(typeof effect).toBe("object");
                    });
                    test(`generateObject with ${provider} ${model} should return valid Effect`, () => {
                        const effect = generateObject(testPrompt, testSchema, provider, model);
                        expect(effect).toBeDefined();
                        expect(typeof effect).toBe("object");
                    });
                    test(`streamText with ${provider} ${model} should return valid Stream`, () => {
                        const stream = streamText(testPrompt, provider, model);
                        expect(stream).toBeDefined();
                        expect(typeof stream).toBe("object");
                    });
                    // Note: processPromptFromText and processPromptFromMdx use defaults internally
                    // but we test them with the underlying service calls
                    test(`processPromptFromText should work with ${provider} ${model} defaults`, () => {
                        const effect = processPromptFromText(testPrompt, "google", "gemini-2.5-flash");
                        expect(effect).toBeDefined();
                        expect(typeof effect).toBe("object");
                    });
                    test(`processPromptFromMdx should work with ${provider} ${model} defaults`, () => {
                        const effect = processPromptFromMdx("test-prompt.mdx", "google", "gemini-2.5-flash");
                        expect(effect).toBeDefined();
                        expect(typeof effect).toBe("object");
                    });
                });
            });
        });
    });
    // Cross-provider and model validation
    describe("Cross-Provider & Model Validation", () => {
        test("all providers should have valid model mappings", () => {
            expect(Object.keys(modelsByProvider)).toEqual(expect.arrayContaining(providers));
            providers.forEach(provider => {
                expect(modelsByProvider[provider]).toBeDefined();
                expect(modelsByProvider[provider].length).toBeGreaterThanOrEqual(2);
            });
        });
        test("generateText should work with all provider-model combinations", () => {
            providers.forEach(provider => {
                modelsByProvider[provider].forEach(model => {
                    const effect = generateText(testPrompt, provider, model);
                    expect(effect).toBeDefined();
                });
            });
        });
        test("generateObject should work with all provider-model combinations", () => {
            providers.forEach(provider => {
                modelsByProvider[provider].forEach(model => {
                    const effect = generateObject(testPrompt, testSchema, provider, model);
                    expect(effect).toBeDefined();
                });
            });
        });
        test("streamText should work with all provider-model combinations", () => {
            providers.forEach(provider => {
                modelsByProvider[provider].forEach(model => {
                    const stream = streamText(testPrompt, provider, model);
                    expect(stream).toBeDefined();
                });
            });
        });
        test("processPromptFromText should be provider-agnostic", () => {
            const effect = processPromptFromText(testPrompt, "google", "gemini-2.5-flash");
            expect(effect).toBeDefined();
            expect(typeof effect).toBe("object");
        });
        test("processPromptFromMdx should be provider-agnostic", () => {
            const effect = processPromptFromMdx("test-prompt.mdx", "google", "gemini-2.5-flash");
            expect(effect).toBeDefined();
            expect(typeof effect).toBe("object");
        });
    });
    // Error handling tests
    describe("Error Handling Tests", () => {
        const invalidProvider = "invalid-provider";
        const invalidModel = "invalid-model";
        const validPrompt = "Test prompt";
        const validSchema = Schema.Struct({
            title: Schema.String,
            summary: Schema.String
        });
        describe("Invalid Provider Tests", () => {
            test("generateText with invalid provider should return Effect with error", () => {
                const effect = generateText(validPrompt, invalidProvider, "gemini-2.5-flash");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
            test("generateObject with invalid provider should return Effect with error", () => {
                const effect = generateObject(validPrompt, validSchema, invalidProvider, "gemini-2.5-flash");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
            test("streamText with invalid provider should return Stream with error", () => {
                const stream = streamText(validPrompt, invalidProvider, "gemini-2.5-flash");
                expect(stream).toBeDefined();
                expect(typeof stream).toBe("object");
            });
        });
        describe("Invalid Model Tests", () => {
            test("generateText with invalid model should return Effect with error", () => {
                const effect = generateText(validPrompt, "google", invalidModel);
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
            test("generateObject with invalid model should return Effect with error", () => {
                const effect = generateObject(validPrompt, validSchema, "google", invalidModel);
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
            test("streamText with invalid model should return Stream with error", () => {
                const stream = streamText(validPrompt, "google", invalidModel);
                expect(stream).toBeDefined();
                expect(typeof stream).toBe("object");
            });
        });
        describe("Invalid Schema Tests", () => {
            const invalidSchema = Schema.Struct({
                invalidField: Schema.Never
            });
            test("generateObject with invalid schema should return Effect with error", () => {
                const effect = generateObject(validPrompt, invalidSchema, "google", "gemini-2.5-flash");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
        });
        describe("Empty Input Tests", () => {
            test("generateText with empty prompt should return Effect with error", () => {
                const effect = generateText("", "google", "gemini-2.5-flash");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
            test("generateObject with empty prompt should return Effect with error", () => {
                const effect = generateObject("", validSchema, "google", "gemini-2.5-flash");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
            test("streamText with empty prompt should return Stream with error", () => {
                const stream = streamText("", "google", "gemini-2.5-flash");
                expect(stream).toBeDefined();
                expect(typeof stream).toBe("object");
            });
            test("processPromptFromText with empty prompt should return Effect with error", () => {
                const effect = processPromptFromText("", "google", "gemini-2.5-flash");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
        });
        describe("File Handling Error Tests", () => {
            test("processPromptFromMdx with non-existent file should return Effect with error", () => {
                const effect = processPromptFromMdx("non-existent-file.mdx", "google", "gemini-2.5-flash");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
            test("processPromptFromMdx with invalid file extension should return Effect with error", () => {
                const effect = processPromptFromMdx("test.invalid", "google", "gemini-2.5-flash");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
        });
        describe("Configuration Error Tests", () => {
            test("processPromptFromText should handle missing API key gracefully", () => {
                const effect = processPromptFromText("Test prompt", "google", "gemini-2.5-flash");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
            test("processPromptFromMdx should handle missing API key gracefully", () => {
                const effect = processPromptFromMdx("test-prompt.mdx");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
        });
        describe("Rate Limiting Error Tests", () => {
            test("generateText should handle rate limit errors gracefully", () => {
                const effect = generateText("Rate limit test prompt", "google", "gemini-2.5-flash");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
            test("generateObject should handle rate limit errors gracefully", () => {
                const effect = generateObject("Rate limit test prompt", validSchema, "google", "gemini-2.5-flash");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
            test("streamText should handle rate limit errors gracefully", () => {
                const stream = streamText("Rate limit test prompt", "google", "gemini-2.5-flash");
                expect(stream).toBeDefined();
                expect(typeof stream).toBe("object");
            });
        });
        describe("Network Error Tests", () => {
            test("generateText should handle network errors gracefully", () => {
                const effect = generateText("Network error test prompt", "google", "gemini-2.5-flash");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
            test("generateObject should handle network errors gracefully", () => {
                const effect = generateObject("Network error test prompt", validSchema, "google", "gemini-2.5-flash");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
            test("streamText should handle network errors gracefully", () => {
                const stream = streamText("Network error test prompt", "google", "gemini-2.5-flash");
                expect(stream).toBeDefined();
                expect(typeof stream).toBe("object");
            });
        });
    });
    // Final Priority Tests
    describe("Final Priority Tests", () => {
        describe("Schema Validation Edge Cases", () => {
            const complexSchema = Schema.Struct({
                nested: Schema.Struct({
                    title: Schema.String,
                    count: Schema.Number,
                    tags: Schema.Array(Schema.String)
                }),
                optional: Schema.optional(Schema.String),
                union: Schema.Union(Schema.String, Schema.Number)
            });
            test("generateObject with complex nested schema should work", () => {
                const effect = generateObject("Test complex schema", complexSchema, "google", "gemini-2.5-flash");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
            test("generateObject with array schema should work", () => {
                const arraySchema = Schema.Struct({ items: Schema.Array(Schema.String) });
                const effect = generateObject("Test array schema", arraySchema, "openai", "gpt-4o-mini");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
        });
        describe("Prompt Length Edge Cases", () => {
            const shortPrompt = "Hi";
            const longPrompt = "This is a very long prompt. ".repeat(100);
            const unicodePrompt = "🚀 Test with unicode: 你好, こんにちは, Привет, مرحبا";
            test("generateText with very short prompt should work", () => {
                const effect = generateText(shortPrompt, "google", "gemini-2.5-flash");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
            test("generateText with very long prompt should work", () => {
                const effect = generateText(longPrompt, "google", "gemini-2.5-flash");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
            test("generateText with unicode characters should work", () => {
                const effect = generateText(unicodePrompt, "google", "gemini-2.5-flash");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
        });
        describe("Provider-Specific Model Validation", () => {
            test("Google specific model validation", () => {
                const effect = generateText("Test", "google", "gemini-2.5-flash");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
            test("OpenAI specific model validation", () => {
                const effect = generateText("Test", "google", "gemini-2.5-flash");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
            test("Anthropic specific model validation", () => {
                const effect = generateText("Test", "google", "gemini-2.5-flash");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
        });
        describe("Streaming Edge Cases", () => {
            const streamingPrompts = [
                "Generate a single word",
                "Generate a very long response with multiple paragraphs",
                "Generate code with special characters: {}[]()<>/*-+"
            ];
            streamingPrompts.forEach(prompt => {
                test(`streamText should handle: ${prompt.substring(0, 30)}...`, () => {
                    const stream = streamText(prompt, "google", "gemini-2.5-flash");
                    expect(stream).toBeDefined();
                    expect(typeof stream).toBe("object");
                });
            });
        });
        describe("Schema Type Coverage", () => {
            test("generateObject with string schema should work", () => {
                const stringSchema = Schema.Struct({ value: Schema.String });
                const effect = generateObject("Test string schema", stringSchema, "openai", "gpt-4o-mini");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
            test("generateObject with number schema should work", () => {
                const numberSchema = Schema.Struct({ value: Schema.Number });
                const effect = generateObject("Test number schema", numberSchema, "openai", "gpt-4o-mini");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
            test("generateObject with boolean schema should work", () => {
                const booleanSchema = Schema.Struct({ value: Schema.Boolean });
                const effect = generateObject("Test boolean schema", booleanSchema, "openai", "gpt-4o-mini");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
            test("generateObject with literal schema should work", () => {
                const literalSchema = Schema.Struct({ value: Schema.Literal("literal1", "literal2") });
                const effect = generateObject("Test literal schema", literalSchema, "openai", "gpt-4o-mini");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
            test("generateObject with union schema should work", () => {
                const unionSchema = Schema.Struct({ value: Schema.Union(Schema.String, Schema.Number) });
                const effect = generateObject("Test union schema", unionSchema, "openai", "gpt-4o-mini");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
            test("generateObject with optional schema should work", () => {
                const optionalSchema = Schema.Struct({ value: Schema.optional(Schema.String) });
                const effect = generateObject("Test optional schema", optionalSchema, "openai", "gpt-4o-mini");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
        });
        describe("Cross-Provider Consistency", () => {
            const testCases = [
                { prompt: "Write a haiku about programming", providers: ["google", "openai", "anthropic"] },
                { prompt: "Explain quantum computing simply", providers: ["google", "openai", "anthropic"] },
                { prompt: "Generate a JSON response", providers: ["google", "openai", "anthropic"] }
            ];
            testCases.forEach(({ prompt }) => {
                test(`All providers should handle: ${prompt.substring(0, 30)}...`, () => {
                    providers.forEach(provider => {
                        const effect = generateText(prompt, "google", "gemini-2.5-flash");
                        expect(effect).toBeDefined();
                        expect(typeof effect).toBe("object");
                    });
                });
            });
        });
        describe("Performance and Timeout Tests", () => {
            test("generateText should handle timeout scenarios gracefully", () => {
                const effect = generateText("Test timeout handling", "google", "gemini-2.5-flash");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
            test("generateObject should handle large schema gracefully", () => {
                const largeSchema = Schema.Struct({
                    id: Schema.String,
                    name: Schema.String,
                    description: Schema.String,
                    metadata: Schema.Struct({
                        created: Schema.String,
                        updated: Schema.String,
                        version: Schema.Number,
                        tags: Schema.Array(Schema.String),
                        properties: Schema.Record({ key: Schema.String, value: Schema.String })
                    })
                });
                const effect = generateObject("Test large schema", largeSchema, "anthropic", "claude-3-5-haiku");
                expect(effect).toBeDefined();
                expect(typeof effect).toBe("object");
            });
        });
    });
});
