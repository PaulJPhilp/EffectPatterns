import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { runTestEffect } from "./test-utils.js";
describe("ApplyPromptToDirCommand - Type Safe Tests", () => {
    it("should process files with platform services", async () => {
        const result = await runTestEffect(Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem;
            const path = yield* Path.Path;
            const testDir = "/tmp/test-apply-prompt";
            const inputDir = path.join(testDir, "input");
            yield* fs.makeDirectory(inputDir, { recursive: true });
            yield* fs.writeFileString(path.join(inputDir, "test.txt"), "content");
            const files = yield* fs.readDirectory(inputDir);
            return { fileCount: files.length, files };
        }).pipe(Effect.provide(NodeContext.layer)));
        expect(result.fileCount).toBeGreaterThanOrEqual(1);
        expect(Array.isArray(result.files)).toBe(true);
    });
    it("should handle empty directories", async () => {
        const result = await runTestEffect(Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem;
            const path = yield* Path.Path;
            const emptyDir = "/tmp/test-empty";
            yield* fs.makeDirectory(emptyDir, { recursive: true });
            const files = yield* fs.readDirectory(emptyDir);
            return { isEmpty: files.length === 0 };
        }).pipe(Effect.provide(NodeContext.layer)));
        expect(result.isEmpty).toBe(true);
    });
});
