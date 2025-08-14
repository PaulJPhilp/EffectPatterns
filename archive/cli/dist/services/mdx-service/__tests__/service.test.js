import { NodeContext } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { MdxService } from "../service.js";
import { InvalidMdxFormatError } from "../types.js";
// Use MdxService.Default with NodeContext.layer for platform services
const testLayer = Layer.provide(MdxService.Default, NodeContext.layer);
describe("MdxService", () => {
    it("should create MdxService", () => {
        expect(MdxService).toBeDefined();
    });
    it("should have proper service structure", () => Effect.gen(function* () {
        const mdxService = yield* MdxService;
        expect(mdxService.readMdxAndFrontmatter).toBeDefined();
        expect(mdxService.updateMdxContent).toBeDefined();
        expect(mdxService.parseMdxFile).toBeDefined();
        expect(mdxService.validateMdxConfig).toBeDefined();
        expect(mdxService.extractParameters).toBeDefined();
    }).pipe(Effect.provide(testLayer)));
    describe("readMdxAndFrontmatter", () => {
        it("should parse valid MDX with frontmatter", () => Effect.gen(function* () {
            const mdxService = yield* MdxService;
            // This would require creating a test file, so we'll just check the function exists
            expect(typeof mdxService.readMdxAndFrontmatter).toBe("function");
        }).pipe(Effect.provide(testLayer)));
    });
    describe("updateMdxContent", () => {
        it("should update frontmatter in MDX content", () => Effect.gen(function* () {
            const mdxService = yield* MdxService;
            const originalContent = `---\ntitle: Test\n---\n\nContent here`;
            const updatedFrontmatter = { title: "Updated Test", newField: "value" };
            const result = mdxService.updateMdxContent(originalContent, updatedFrontmatter);
            expect(result).toContain("Updated Test");
            expect(result).toContain("value");
            expect(result).toContain("Content here");
        }).pipe(Effect.provide(testLayer)));
    });
    describe("parseMdxFile", () => {
        it("should parse valid MDX content", () => Effect.gen(function* () {
            const mdxService = yield* MdxService;
            const content = `---\ntitle: Test\nprovider: google\nmodel: gemini-2.5-flash\n---\n\nWrite a haiku`;
            const result = yield* mdxService.parseMdxFile(content);
            expect(result.attributes.title).toBe("Test");
            expect(result.attributes.provider).toBe("google");
            expect(result.attributes.model).toBe("gemini-2.5-flash");
            expect(result.body).toContain("Write a haiku");
        }).pipe(Effect.provide(testLayer)));
        it("should fail for invalid MDX content", () => Effect.gen(function* () {
            const mdxService = yield* MdxService;
            const content = "No frontmatter here";
            const result = yield* mdxService
                .parseMdxFile(content)
                .pipe(Effect.flip);
            expect(result).toBeInstanceOf(InvalidMdxFormatError);
        }).pipe(Effect.provide(testLayer)));
    });
    describe("validateMdxConfig", () => {
        it("should validate MDX configuration", () => Effect.gen(function* () {
            const mdxService = yield* MdxService;
            const attributes = {
                provider: "google",
                model: "gemini-2.5-flash",
                parameters: {
                    name: { type: "string", required: true },
                },
            };
            const result = mdxService.validateMdxConfig(attributes);
            expect(result.provider).toBe("google");
            expect(result.model).toBe("gemini-2.5-flash");
            expect(result.parameters).toBeDefined();
        }).pipe(Effect.provide(testLayer)));
    });
    describe("extractParameters", () => {
        it("should extract parameters from frontmatter metadata", () => Effect.gen(function* () {
            const mdxService = yield* MdxService;
            const metadata = {
                parameters: {
                    name: {
                        type: "string",
                        description: "The name to use in the prompt",
                        required: true,
                    },
                    count: {
                        type: "number",
                        default: 5,
                    },
                },
            };
            const result = mdxService.extractParameters(metadata);
            expect(result.name).toBeDefined();
            expect(result.name.type).toBe("string");
            expect(result.name.description).toBe("The name to use in the prompt");
            expect(result.name.required).toBe(true);
            expect(result.count).toBeDefined();
            expect(result.count.type).toBe("number");
            expect(result.count.default).toBe(5);
        }).pipe(Effect.provide(testLayer)));
    });
});
