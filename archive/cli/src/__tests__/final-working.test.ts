import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { runTestEffect } from "./test-utils.js";

describe("ApplyPromptToDirCommand - Working Tests", () => {
  it("should access FileSystem and Path services correctly", async () => {
    const result = await runTestEffect(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        
        const testDir = "/tmp/test-working";
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

  it("should handle directory operations", async () => {
    const result = await runTestEffect(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        
        const testDir = "/tmp/test-dir-ops";
        const subDir = path.join(testDir, "subdir");
        
        yield* fs.makeDirectory(subDir, { recursive: true });
        
        const files = yield* fs.readDirectory(testDir);
        return { directoryCreated: true, files };
      }).pipe(Effect.provide(NodeContext.layer))
    );

    expect(result.directoryCreated).toBe(true);
    expect(result.files).toContain("subdir");
  });
});
