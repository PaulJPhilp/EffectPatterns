import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { FileSystem } from "@effect/platform/FileSystem";
import { Path } from "@effect/platform/Path";
import { NodeContext } from "@effect/platform-node";
import { runTestEffect } from "../runtime/testing-runtime.js";

describe("apply-prompt-to-dir command", () => {
  it("should process .mdx template with parameters", () => {
    const testTemplate = `---
parameters:
  topic:
    type: string
    required: true
    description: Topic to write about
  style:
    type: string
    required: false
    default: formal
---

# {{ topic }} in Effect

Write about {{ topic }} using {{ style }} style.`;

    const testFile = `This is a test file about Effect patterns.`;

    return runTestEffect(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        const path = yield* Path;

        // Create test directories
        const inputDir = "/tmp/test-input";
        const outputDir = "/tmp/test-output";
        const templateFile = "/tmp/test-template.mdx";

        yield* fs.makeDirectory(inputDir, { recursive: true });
        yield* fs.makeDirectory(outputDir, { recursive: true });

        // Create template file
        yield* fs.writeFileString(templateFile, testTemplate);

        // Create input file
        yield* fs.writeFileString(
          yield* path.join(inputDir, "test.md"),
          testFile
        );

        // Test template loading and rendering
        const { TemplateService } = yield* import("../services/prompt-template/service.js");
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
      }).pipe(Effect.provide(NodeContext.layer))
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

    return runTestEffect(
      Effect.gen(function* () {
        const { TemplateService } = yield* import("../services/prompt-template/service.js");
        const templateService = yield* TemplateService;

        // Create test template
        const fs = yield* FileSystem;
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
      }).pipe(Effect.provide(NodeContext.layer))
    );
  });

  it("should handle non-mdx files as raw content", () => {
    const testPrompt = "This is a raw prompt without template variables.";

    return runTestEffect(
      Effect.gen(function* () {
        const fs = yield* FileSystem;
        const promptFile = "/tmp/test-prompt.txt";
        yield* fs.writeFileString(promptFile, testPrompt);

        // Raw prompt should be used as-is
        const content = yield* fs.readFileString(promptFile);
        expect(content).toBe(testPrompt);

        // Cleanup
        yield* fs.remove(promptFile);
      }).pipe(Effect.provide(NodeContext.layer))
    );
  });
});
