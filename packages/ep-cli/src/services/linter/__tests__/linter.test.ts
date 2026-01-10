import { Effect, Layer } from "effect";
import fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Logger } from "../../logger/index.js";
import { Linter } from "../service.js";

// --- Mocking ---

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

const TestLayer = Linter.Default.pipe(Layer.provide(Logger.Default));

// --- Tests ---

describe("Linter Service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("lintFiles", () => {
    it("should identify effect-use-tap-error", async () => {
      const content = `Effect.catchAll((err) => Console.log("failed"))`;
      (fs.readFile as any).mockResolvedValue(content);
      
      const program = Linter.lintFiles(["test.ts"]).pipe(
        Effect.provide(TestLayer)
      );
      
      const results = await Effect.runPromise(program);
      expect(results[0].issues).toContainEqual(expect.objectContaining({
        rule: "effect-use-tap-error"
      }));
    });

    it("should identify effect-explicit-concurrency", async () => {
      const content = `Effect.all([task1, task2])`;
      (fs.readFile as any).mockResolvedValue(content);
      
      const program = Linter.lintFiles(["test.ts"]).pipe(
        Effect.provide(TestLayer)
      );
      
      const results = await Effect.runPromise(program);
      expect(results[0].issues).toContainEqual(expect.objectContaining({
        rule: "effect-explicit-concurrency"
      }));
    });

    it("should not flag Effect.all with concurrency", async () => {
      const content = `Effect.all([task1], { concurrency: 2 })`;
      (fs.readFile as any).mockResolvedValue(content);
      
      const program = Linter.lintFiles(["test.ts"]).pipe(
        Effect.provide(TestLayer)
      );
      
      const results = await Effect.runPromise(program);
      expect(results[0].issues.length).toBe(0);
    });

    it("should identify deprecated APIs", async () => {
      const content = `Option.zip(a, b)`;
      (fs.readFile as any).mockResolvedValue(content);
      
      const program = Linter.lintFiles(["test.ts"]).pipe(
        Effect.provide(TestLayer)
      );
      
      const results = await Effect.runPromise(program);
      expect(results[0].issues).toContainEqual(expect.objectContaining({
        rule: "effect-deprecated-api"
      }));
    });

    it("should handle file read errors", async () => {
      (fs.readFile as any).mockRejectedValue(new Error("Disk failure"));
      
      const program = Linter.lintFiles(["test.ts"]).pipe(
        Effect.provide(TestLayer)
      );
      
      await expect(Effect.runPromise(program)).rejects.toThrow("Disk failure");
    });
  });

  describe("printResults", () => {
    it("should return 1 if there are errors", async () => {
      vi.spyOn(console, "log").mockImplementation(() => {});
      const results = [{
        file: "test.ts",
        issues: [],
        errors: 1,
        warnings: 0,
        info: 0
      }];
      
      const program = Linter.printResults(results).pipe(
        Effect.provide(TestLayer)
      );
      
      const exitCode = await Effect.runPromise(program);
      expect(exitCode).toBe(1);
    });

    it("should return 0 if there are no errors", async () => {
      vi.spyOn(console, "log").mockImplementation(() => {});
      const results = [{
        file: "test.ts",
        issues: [],
        errors: 0,
        warnings: 1,
        info: 0
      }];
      
      const program = Linter.printResults(results).pipe(
        Effect.provide(TestLayer)
      );
      
      const exitCode = await Effect.runPromise(program);
      expect(exitCode).toBe(0);
    });
  });
});
