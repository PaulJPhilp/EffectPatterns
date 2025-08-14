import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { runTestEffect } from "./test-utils.js";

describe("ApplyPromptToDirCommand - Fixed Service Access", () => {
  it("should access FileSystem and Path services correctly", async () => {
    const result = await runTestEffect(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;

        const testDir = "/tmp/test-apply-prompt-fixed";
        const testFile = path.join(testDir, "test.txt");

        yield* fs.makeDirectory(testDir, { recursive: true });
        yield* fs.writeFileString(testFile, "Hello World");

        const content = yield* fs.readFileString(testFile);
        return { content, fileExists: true };
      }).pipe(Effect.provide(NodeContext.layer))
    );

    expect(result.content).toBe("Hello World");
    expect(result.fileExists).toBe(true);
  });

  it("should handle empty directories", async () => {
    const result = await runTestEffect(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;

        const emptyDir = "/tmp/test-empty-fixed";
        yield* fs.makeDirectory(emptyDir, { recursive: true });

        const files = yield* fs.readDirectory(emptyDir);
        return { isEmpty: files.length === 0, fileCount: files.length };
      }).pipe(Effect.provide(NodeContext.layer))
    );

    expect(result.isEmpty).toBe(true);
    expect(result.fileCount).toBe(0);
  });
});
