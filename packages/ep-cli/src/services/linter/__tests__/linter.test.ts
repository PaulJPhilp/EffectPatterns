import { Effect, Layer } from "effect";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { captureConsole } from "../../../test/helpers.js";
import { Logger } from "../../logger/index.js";
import { Linter } from "../service.js";

const TestLayer = Linter.Default.pipe(Layer.provide(Logger.Default));

describe("Linter Service", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ep-cli-linter-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const writeFixture = async (name: string, content: string) => {
    const filePath = path.join(tmpDir, name);
    await fs.writeFile(filePath, content, "utf8");
    return filePath;
  };

  describe("lintFiles", () => {
    it("should identify effect-use-tap-error", async () => {
      const filePath = await writeFixture(
        "test.ts",
        `Effect.catchAll((err) => Console.log("failed"))`
      );

      const program = Linter.lintFiles([filePath]).pipe(Effect.provide(TestLayer));

      const results = await Effect.runPromise(program);
      expect(results[0].issues).toContainEqual(
        expect.objectContaining({ rule: "effect-use-tap-error" })
      );
    });

    it("should identify effect-explicit-concurrency", async () => {
      const filePath = await writeFixture("test.ts", `Effect.all([task1, task2])`);

      const program = Linter.lintFiles([filePath]).pipe(Effect.provide(TestLayer));

      const results = await Effect.runPromise(program);
      expect(results[0].issues).toContainEqual(
        expect.objectContaining({ rule: "effect-explicit-concurrency" })
      );
    });

    it("should not flag Effect.all with concurrency", async () => {
      const filePath = await writeFixture(
        "test.ts",
        `Effect.all([task1], { concurrency: 2 })`
      );

      const program = Linter.lintFiles([filePath]).pipe(Effect.provide(TestLayer));

      const results = await Effect.runPromise(program);
      expect(results[0].issues.length).toBe(0);
    });

    it("should identify deprecated APIs", async () => {
      const filePath = await writeFixture("test.ts", `Option.zip(a, b)`);

      const program = Linter.lintFiles([filePath]).pipe(Effect.provide(TestLayer));

      const results = await Effect.runPromise(program);
      expect(results[0].issues).toContainEqual(
        expect.objectContaining({ rule: "effect-deprecated-api" })
      );
    });

    it("should handle file read errors", async () => {
      const filePath = path.join(tmpDir, "nonexistent.ts");

      const program = Linter.lintFiles([filePath]).pipe(Effect.provide(TestLayer));

      await expect(Effect.runPromise(program)).rejects.toThrow(/Failed to read file/);
    });
  });

  describe("printResults", () => {
    it("should return 1 if there are errors", async () => {
      const capture = captureConsole();
      try {
        const results = [
          { file: "test.ts", issues: [], errors: 1, warnings: 0, info: 0 },
        ];

        const program = Linter.printResults(results).pipe(Effect.provide(TestLayer));
        const exitCode = await Effect.runPromise(program);
        expect(exitCode).toBe(1);
      } finally {
        capture.restore();
      }
    });

    it("should return 0 if there are no errors", async () => {
      const capture = captureConsole();
      try {
        const results = [
          { file: "test.ts", issues: [], errors: 0, warnings: 1, info: 0 },
        ];

        const program = Linter.printResults(results).pipe(Effect.provide(TestLayer));
        const exitCode = await Effect.runPromise(program);
        expect(exitCode).toBe(0);
      } finally {
        capture.restore();
      }
    });
  });
});
