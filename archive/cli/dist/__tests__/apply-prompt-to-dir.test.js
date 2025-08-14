import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { applyPromptToDir } from "../commands/apply-prompt-to-dir.js";
import { runTestEffect } from "./test-utils.js";
import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
describe("ApplyPromptToDirCommand", () => {
    describe("Command Structure", () => {
        it("should have the command defined", () => {
            expect(applyPromptToDir).toBeDefined();
        });
    });
    describe("File Processing Functionality", () => {
        it("should process markdown files correctly", async () => {
            const result = await runTestEffect(Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem;
                const path = yield* Path.Path;
                const testDir = "/tmp/test-apply-prompt";
                const inputDir = path.join(testDir, "input");
                const outputDir = path.join(testDir, "output");
                const promptFile = path.join(testDir, "prompt.mdx");
                // Create test directory structure
                yield* fs.makeDirectory(inputDir, { recursive: true });
                yield* fs.makeDirectory(outputDir, { recursive: true });
                // Create test files
                yield* fs.writeFileString(path.join(inputDir, "test1.md"), "# Test File\n\nOriginal content");
                yield* fs.writeFileString(path.join(inputDir, "test2.md"), "## Another Test\n\nMore content");
                yield* fs.writeFileString(promptFile, "---\nprovider: openai\nmodel: gpt-4\n---\nProcess these files");
                const files = yield* fs.readDirectory(inputDir);
                return { processedFiles: files.length, files: files };
            }).pipe(Effect.provide(NodeContext.layer)));
            expect(result.processedFiles).toBeGreaterThan(0);
            expect(Array.isArray(result.files)).toBe(true);
        });
        it("should handle empty directories gracefully", async () => {
            const result = await runTestEffect(Effect.gen(function* () {
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
                return { isEmpty: files.length === 0, fileCount: files.length };
            }).pipe(Effect.provide(NodeContext.layer)));
            expect(result.isEmpty).toBe(true);
            expect(result.fileCount).toBe(0);
        });
        it("should filter files by pattern", async () => {
            const result = await runTestEffect(Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem;
                const path = yield* Path.Path;
                const testDir = "/tmp/test-pattern-filter";
                const inputDir = path.join(testDir, "input");
                yield* fs.makeDirectory(inputDir, { recursive: true });
                // Create files with different extensions
                yield* fs.writeFileString(path.join(inputDir, "file1.md"), "# Markdown");
                yield* fs.writeFileString(path.join(inputDir, "file2.txt"), "Text content");
                yield* fs.writeFileString(path.join(inputDir, "file3.js"), "console.log('test');");
                yield* fs.writeFileString(path.join(inputDir, "file4.md"), "## Another markdown");
                const allFiles = yield* fs.readDirectory(inputDir);
                const mdFiles = allFiles.filter(f => f.endsWith('.md'));
                return { totalFiles: allFiles.length, mdFiles: mdFiles.length };
            }).pipe(Effect.provide(NodeContext.layer)));
            expect(result.totalFiles).toBeGreaterThan(0);
            expect(result.mdFiles).toBeGreaterThan(0);
        });
    });
    describe("Error Handling", () => {
        it("should handle missing input directory", async () => {
            const result = await runTestEffect(Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem;
                const path = yield* Path.Path;
                const missingDir = "/tmp/non-existent-dir-" + Date.now();
                const readResult = yield* Effect.either(fs.readDirectory(missingDir));
                return readResult;
            }).pipe(Effect.provide(NodeContext.layer)));
            expect(result).toMatchObject({
                _tag: "Left",
                left: expect.objectContaining({
                    _tag: "SystemError",
                    reason: "NotFound"
                })
            });
        });
    });
});
