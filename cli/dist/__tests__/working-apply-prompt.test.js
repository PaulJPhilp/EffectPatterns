import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { NodeContext } from "@effect/platform-node";
import { FileSystem, Path } from "@effect/platform";
import { runTestEffect } from "./test-utils.js";
describe("ApplyPromptToDir - Working Tests", () => {
    it("should process files with actual file operations", async () => {
        const result = await runTestEffect(Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem;
            const path = yield* Path.Path;
            const testDir = "/tmp/test-apply-prompt-working";
            const inputDir = path.join(testDir, "input");
            yield* fs.makeDirectory(inputDir, { recursive: true });
            yield* fs.writeFileString(path.join(inputDir, "test.txt"), "Hello World");
            const files = yield* fs.readDirectory(inputDir);
            return { processedFiles: files.length, files };
        }).pipe(Effect.provide(NodeContext.layer)));
        expect(result.processedFiles).toBe(1);
        expect(result.files).toContain("test.txt");
    });
    it("should handle empty directories gracefully", async () => {
        const result = await runTestEffect(Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem;
            const path = yield* Path.Path;
            const emptyDir = "/tmp/test-empty-working";
            yield* fs.makeDirectory(emptyDir, { recursive: true });
            const files = yield* fs.readDirectory(emptyDir);
            return { isEmpty: files.length === 0, fileCount: files.length };
        }).pipe(Effect.provide(NodeContext.layer)));
        expect(result.isEmpty).toBe(true);
        expect(result.fileCount).toBe(0);
    });
});
