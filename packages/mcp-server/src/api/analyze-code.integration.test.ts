import { AnalysisService } from "@effect-patterns/analysis-core";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { AppLayer } from "../server/init";

describe("Analyze Code Integration", () => {
  it("should analyze code using the AnalysisService via AppLayer", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AnalysisService;
        const source = `
          import { Effect } from "effect";
          const foo = async () => {
             return Effect.succeed(1);
          }
        `;
        // filename implies it's not a boundary file, so async should be flagged
        return yield* service.analyzeFile("src/foo.ts", source);
      }).pipe(Effect.provide(AppLayer), Effect.scoped)
    );

    expect(result.filename).toBe("src/foo.ts");
    expect(result.suggestions.length).toBeGreaterThan(0);
    
    // Check for specific AST-detected rule
    const asyncRule = result.suggestions.find(s => s.id === "async-await");
    expect(asyncRule).toBeDefined();
    expect(asyncRule?.severity).toBe("high");

    const finding = result.findings.find(f => f.ruleId === "async-await");
    expect(finding).toBeDefined();
    expect(finding?.range).toBeDefined();
    // AST based range should point to the async keyword or function start
    expect(finding?.range.startLine).toBeGreaterThan(0);
  });

  it("should handle node:fs imports correctly", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AnalysisService;
        const source = `import fs from "node:fs";`;
        return yield* service.analyzeFile("src/fs-usage.ts", source);
      }).pipe(Effect.provide(AppLayer), Effect.scoped)
    );

    const nodeFsRule = result.suggestions.find(s => s.id === "node-fs");
    expect(nodeFsRule).toBeDefined();
  });
});
