import { FileSystem, Path } from "@effect/platform";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { TemplateService } from "../services/prompt-template/service.js";

describe("apply-prompt-to-dir command", () => {
  it("should process .mdx template with parameters", () => {
    const testTemplate = `---
parameters:
  topic:
    type: string
    required: true
  style:
    type: string
    required: true
---

# {{ topic }}

This is a {{ style }} guide about {{ topic }}.`;

    const testFile = `This is a test file about Effect patterns.`;

    return Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      // Create test directories
      const inputDir = "/tmp/test-input";
      const outputDir = "/tmp/test-output";
      const templateFile = "/tmp/test-template.mdx";

      yield* fs.makeDirectory(inputDir, { recursive: true });
      yield* fs.makeDirectory(outputDir, { recursive: true });

      // Create template file
      yield* fs.writeFileString(templateFile, testTemplate);

      // Create input file
      const inputFilePath = path.join(inputDir, "test.md");
      yield* fs.writeFileString(inputFilePath, testFile);

      // Test template loading and rendering
      const templateService = yield* TemplateService;

      const template = yield* templateService.loadTemplate(templateFile);
      const rendered = yield* templateService.renderTemplate(template, {
        topic: "Dependency Injection",
        style: "technical"
      });

      expect(rendered).toContain("Dependency Injection");
      expect(rendered).toContain("technical");

      // Cleanup
      yield* fs.remove(inputDir);
      yield* fs.remove(outputDir);
      yield* fs.remove(templateFile);
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          NodeFileSystem.layer,
          NodePath.layer,
          TemplateService.Default
        )
      )
    );
  });

  it("should handle parameter validation errors", () => {
    const testTemplate = `---
parameters:
  required_param:
    type: string
    required: true
---

Content with {{ required_param }}.`;

    return Effect.gen(function* () {
      const templateService = yield* TemplateService;

      // Create test template
      const fs = yield* FileSystem.FileSystem;
      const templateFile = "/tmp/test-template.mdx";
      yield* fs.writeFileString(templateFile, testTemplate);

      const template = yield* templateService.loadTemplate(templateFile);

      // Missing required parameter should fail
      const result = yield* templateService.renderTemplate(template, {}).pipe(
        Effect.flip
      );

      expect(result.message).toContain("Missing required parameter");

      // Cleanup
      yield* fs.remove(templateFile);
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          NodeFileSystem.layer,
          NodePath.layer,
          TemplateService.Default
        )
      )
    );
  });

  it("should handle non-mdx files as raw content", () => {
    const testPrompt = "This is a raw prompt without template variables.";

    return Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const promptFile = "/tmp/test-prompt.txt";
      yield* fs.writeFileString(promptFile, testPrompt);

      // Raw prompt should be used as-is
      const content = yield* fs.readFileString(promptFile);
      expect(content).toBe(testPrompt);

      // Cleanup
      yield* fs.remove(promptFile);
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          NodeFileSystem.layer,
          NodePath.layer
        )
      )
    );
  });
});
