import { describe, it, expect } from "vitest";
import { Effect, Layer } from "effect";
import { TemplateService, type PromptTemplate } from "./service.js";
import { NodeContext } from "@effect/platform-node";

// Use TemplateService.Default with NodeContext.layer for platform services
const testLayer = Layer.provide(TemplateService.Default, NodeContext.layer);

describe("TemplateService", () => {
  describe("validateParameters", () => {
    it("should validate required parameters", () => {
      return Effect.gen(function* () {
        const templateService = yield* TemplateService;
        const template: PromptTemplate = {
          content: "test",
          parameters: {
            name: { type: "string", required: true }
          },
          metadata: {}
        };

        const result = yield* templateService.validateParameters(template, {}).pipe(
          Effect.flip
        );
        expect(result.message).toContain("Missing required parameters: name");
      }).pipe(Effect.provide(testLayer));
    });

    it("should validate parameter types", () => {
      return Effect.gen(function* () {
        const templateService = yield* TemplateService;
        const template: PromptTemplate = {
          content: "test",
          parameters: {
            age: { type: "number", required: true }
          },
          metadata: {}
        };

        const result = yield* templateService.validateParameters(template, {
          age: "not a number"
        }).pipe(Effect.flip);
        expect(result.message).toContain("Expected number");
      }).pipe(Effect.provide(testLayer));
    });
  });

  describe("renderTemplate", () => {
    it("should render template with parameters", () => {
      return Effect.gen(function* () {
        const templateService = yield* TemplateService;
        const template: PromptTemplate = {
          content: "Hello {{ name }}! You are {{ age }} years old.",
          parameters: {
            name: { type: "string", required: true },
            age: { type: "number", required: true }
          },
          metadata: {}
        };

        const rendered = yield* templateService.renderTemplate(template, {
          name: "Alice",
          age: 25
        });

        expect(rendered).toBe("Hello Alice! You are 25 years old.");
      }).pipe(Effect.provide(testLayer));
    });

    it("should use default values when parameters are missing", () => {
      return Effect.gen(function* () {
        const templateService = yield* TemplateService;
        const template: PromptTemplate = {
          content: "Hello {{ name }}! You are {{ age }} years old.",
          parameters: {
            name: { type: "string", required: true },
            age: { type: "number", required: false, default: 30 }
          },
          metadata: {}
        };

        const rendered = yield* templateService.renderTemplate(template, {
          name: "Bob"
        });

        expect(rendered).toBe("Hello Bob! You are 30 years old.");
      }).pipe(Effect.provide(testLayer));
    });
  });
});
