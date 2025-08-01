import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { runTestEffect } from "./test-utils.js";
import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";

describe("Platform Services - Working Tests", () => {
  it("should access FileSystem and Path services via runtime", async () => {
    const result = await runTestEffect(
      Effect.gen(function* () {
        // Access services directly via yield*
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        
        const testDir = "/tmp/test-platform-services";
        const testFile = path.join(testDir, "test.txt");
        
        yield* fs.makeDirectory(testDir, { recursive: true });
        yield* fs.writeFileString(testFile, "Hello Platform Services");
        
        const content = yield* fs.readFileString(testFile);
        return { content, fileExists: true };
      }).pipe(Effect.provide(NodeContext.layer))
    );

    expect(result.content).toBe("Hello Platform Services");
    expect(result.fileExists).toBe(true);
  });

  it("should handle directory operations with platform services", async () => {
    const result = await runTestEffect(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        
        const testDir = "/tmp/test-dir-ops";
        const subDir = path.join(testDir, "subdir");
        
        yield* fs.makeDirectory(subDir, { recursive: true });
        
        const files = yield* fs.readDirectory(testDir);
        return { directoryCreated: true, fileCount: files.length };
      }).pipe(Effect.provide(NodeContext.layer))
    );

    expect(result.directoryCreated).toBe(true);
    expect(result.fileCount).toBe(1);
  });
});
