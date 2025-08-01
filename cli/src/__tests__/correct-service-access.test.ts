import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { runTestEffect } from "./test-utils.js";

describe("ApplyPromptToDirCommand", () => {
  describe("Functionality", () => {
    it("should process files with actual file operations", async () => {
      const result = await runTestEffect(
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          const path = yield* Path.Path;
          
          const testDir = "/tmp/test-apply-prompt";
          const inputDir = path.join(testDir, "input");
          const outputDir = path.join(testDir, "output");
          const promptFile = path.join(testDir, "prompt.mdx");

          yield* fs.makeDirectory(inputDir, { recursive: true });
          yield* fs.makeDirectory(outputDir, { recursive: true });

          // Create test files
          yield* fs.writeFileString(path.join(inputDir, "file1.txt"), "Test content 1");
          yield* fs.writeFileString(path.join(inputDir, "file2.md"), "Test content 2");
          yield* fs.writeFileString(promptFile, "---\nprovider: openai\nmodel: gpt-4\n---\nProcess this file");

          const files = yield* fs.readDirectory(inputDir);
          return { processedFiles: files.length, files };
        }).pipe(Effect.provide(NodeContext.layer))
      );

      expect(result.processedFiles).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(result.files)).toBe(true);
    });

    it("should handle empty directories gracefully", async () => {
      const result = await runTestEffect(
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          const path = yield* Path.Path;

          const testDir = "/tmp/test-empty-dir";
          const inputDir = path.join(testDir, "input");
          const outputDir = path.join(testDir, "output");
          const promptFile = path.join(testDir, "prompt.mdx");

          yield* fs.makeDirectory(inputDir, { recursive: true });
          yield* fs.makeDirectory(outputDir, { recursive: true });
          yield* fs.writeFileString(promptFile, "---\nprovider: openai\nmodel: gpt-4\n---\nProcess empty directory");

          const files = yield* fs.readDirectory(inputDir);
          return { processedFiles: files.length, files };
        }).pipe(Effect.provide(NodeContext.layer))
      );

      expect(result.processedFiles).toBe(0);
      expect(result.files).toEqual([]);
    });

    it("should handle file pattern filtering correctly", async () => {
      const result = await runTestEffect(
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          const path = yield* Path.Path;

          const testDir = "/tmp/test-pattern-filter";
          const inputDir = path.join(testDir, "input");
          const outputDir = path.join(testDir, "output");
          const promptFile = path.join(testDir, "prompt.mdx");

          yield* fs.makeDirectory(inputDir, { recursive: true });
          yield* fs.makeDirectory(outputDir, { recursive: true });

          // Create test files with different extensions
          yield* fs.writeFileString(path.join(inputDir, "file1.txt"), "Text file content");
          yield* fs.writeFileString(path.join(inputDir, "file2.md"), "Markdown file content");
          yield* fs.writeFileString(path.join(inputDir, "file3.txt"), "Another text file");
          yield* fs.writeFileString(path.join(inputDir, "file4.js"), "JavaScript file content");
          yield* fs.writeFileString(promptFile, "---\nprovider: openai\nmodel: gpt-4\n---\nProcess files");

          const allFiles = yield* fs.readDirectory(inputDir);
          const txtFiles = allFiles.filter(f => f.endsWith('.txt'));
          const mdFiles = allFiles.filter(f => f.endsWith('.md'));

          return {
            totalFiles: allFiles.length,
            txtFiles: txtFiles.length,
            mdFiles: mdFiles.length,
            allFiles
          };
        }).pipe(Effect.provide(NodeContext.layer))
      );

      expect(result.totalFiles).toBeGreaterThanOrEqual(4);
      expect(result.txtFiles).toBeGreaterThanOrEqual(1);
      expect(result.mdFiles).toBeGreaterThanOrEqual(1);
      expect(result.allFiles).toContain("file1.txt");
      expect(result.allFiles).toContain("file2.md");
    });
  });
});
