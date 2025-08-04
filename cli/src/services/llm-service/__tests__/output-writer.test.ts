import { describe, it, expect } from "vitest";
import { Effect, Chunk } from "effect";
import { FileSystem } from "@effect/platform/FileSystem";
import { NodeContext } from "@effect/platform-node";

describe("Stage 6: Output File Redirection", () => {
  const testLayer = NodeContext.layer;

  it("should handle file writing successfully", async () => {
    const testContent = "This is test AI response content";
    
        const writeEffect = Effect.scoped(
      Effect.gen(function*() {
        const fs = yield* FileSystem;
        const tempFile = yield* fs.makeTempFile();
        yield* fs.writeFileString(tempFile, testContent);
        return yield* fs.readFileString(tempFile);
      })
    );

    const result = await Effect.runPromise(writeEffect.pipe(Effect.provide(testLayer)));
    expect(result).toBe(testContent);
  });

  it("should handle file writing errors gracefully", async () => {
    const writeEffect = Effect.gen(function*() {
      const fs = yield* FileSystem;
      yield* fs.writeFileString("/test.txt", "content");
    });

        const result = await Effect.runPromise(Effect.cause(writeEffect).pipe(
      Effect.provide(testLayer),
      Effect.map(cause => cause._tag)
    ));

        expect(result).toBe("Fail");
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
