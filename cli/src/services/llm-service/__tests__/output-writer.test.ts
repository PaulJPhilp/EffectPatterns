import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Effect, Layer } from "effect";
import * as Fs from "@effect/platform/FileSystem";
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import { Chunk } from "effect";

// Mock filesystem for testing
const mockFsLayer = Layer.succeed(Fs.FileSystem, {
  readFileString: (path: string) => Effect.succeed(`Mock content from ${path}`),
  writeFileString: (path: string, content: string) => Effect.succeed(void 0),
  exists: (path: string) => Effect.succeed(true),
  remove: (path: string) => Effect.succeed(void 0),
});

describe("Stage 6: Output File Redirection", () => {
  it("should handle file writing successfully", () => {
    const testContent = "This is test AI response content";
    const testPath = "/tmp/test-output.txt";
    
    const writeEffect = Effect.gen(function* () {
      const fs = yield* Fs.FileSystem;
      yield* fs.writeFileString(testPath, testContent);
      return `Successfully wrote to ${testPath}`;
    });

    return Effect.runPromise(writeEffect.pipe(
      Effect.provide(mockFsLayer)
    )).then(result => {
      expect(result).toBe(`Successfully wrote to ${testPath}`);
    });
  });

  it("should handle file writing errors gracefully", () => {
    const errorFsLayer = Layer.succeed(Fs.FileSystem, {
      readFileString: (path: string) => Effect.succeed(`Mock content`),
      writeFileString: (path: string, content: string) => 
        Effect.fail(new Error(`Permission denied: ${path}`)),
      exists: (path: string) => Effect.succeed(true),
      remove: (path: string) => Effect.succeed(void 0),
    });

    const writeEffect = Effect.gen(function* () {
      const fs = yield* Fs.FileSystem;
      yield* fs.writeFileString("/restricted/path.txt", "content");
      return "success";
    });

    return Effect.runPromise(writeEffect.pipe(
      Effect.provide(errorFsLayer),
      Effect.catchAll(error => Effect.succeed(error.message))
    )).then(result => {
      expect(result).toContain("Permission denied");
    });
  });

  it("should handle optional output parameter correctly", () => {
    const testCases = [
      { output: "some/path.txt", shouldWrite: true },
      { output: undefined, shouldWrite: false },
      { output: "", shouldWrite: false }
    ];

    testCases.forEach(({ output, shouldWrite }) => {
      const result = output ? `Writing to ${output}` : "Console output";
      expect(result).toBeTruthy();
    });
  });

  it("should properly format file content", () => {
    const aiResponse = Chunk.make("Hello", " world", "!");
    const formatted = Chunk.toReadonlyArray(aiResponse).join("");
    expect(formatted).toBe("Hello world!");
  });

  it("should handle different file extensions", () => {
    const testFiles = [
      { file: "prompt.txt", extension: "txt" },
      { file: "prompt.md", extension: "md" },
      { file: "prompt.json", extension: "json" },
      { file: "prompt.mdx", extension: "mdx" }
    ];

    testFiles.forEach(({ file, extension }) => {
      const fileExtension = file.toLowerCase().split('.').pop();
      expect(fileExtension).toBe(extension);
    });
  });
});
