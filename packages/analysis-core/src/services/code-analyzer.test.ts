import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { CodeAnalyzerService } from "./code-analyzer";
import { RuleRegistryService } from "./rule-registry";

const analyze = (source: string, filename = "test.ts") =>
  Effect.runPromise(
    Effect.gen(function* () {
      const analyzer = yield* CodeAnalyzerService;
      return yield* analyzer.analyze({ source, filename, analysisType: "all" });
    }).pipe(
      Effect.provide(CodeAnalyzerService.Default),
      Effect.provide(RuleRegistryService.Default)
    )
  );

describe("CodeAnalyzerService", () => {
  it("detects async/await usage in Effect context", async () => {
    const source = `
      import { Effect } from "effect";
      export const foo = async () => {
        const x = await Promise.resolve(1);
        return Effect.succeed(x);
      };
    `;
    const result = await analyze(source);
    expect(result.suggestions.some((s) => s.id === "async-await")).toBe(true);
    expect(result.findings.some((f) => f.ruleId === "async-await")).toBe(true);
  });

  it("ignores async/await in boundary files", async () => {
    const source = `
      import { Effect } from "effect";
      export async function GET() {
        return Response.json({ ok: true });
      }
    `;
    const result = await analyze(source, "app/api/users/route.ts");
    expect(result.suggestions.some((s) => s.id === "async-await")).toBe(false);
  });

  it("detects node:fs imports", async () => {
    const source = `import fs from "node:fs";`;
    const result = await analyze(source);
    expect(result.suggestions.some((s) => s.id === "node-fs")).toBe(true);
  });

  it("detects try/catch inside Effect code", async () => {
    const source = `
      import { Effect } from "effect";
      export const task = Effect.gen(function*() {
        try {
          yield* Effect.log("hi");
        } catch (e) {
          console.error(e);
        }
      });
    `;
    const result = await analyze(source);
    expect(result.suggestions.some((s) => s.id === "try-catch-in-effect")).toBe(
      true
    );
  });

  it("detects catch-log-and-swallow", async () => {
    const source = `
      import { Effect } from "effect";
      export const task = Effect.gen(function*() {
        try {
          doSomething();
        } catch (e) {
          console.error(e);
          return; // swallow
        }
      });
    `;
    const result = await analyze(source);
    expect(result.suggestions.some((s) => s.id === "catch-log-and-swallow")).toBe(
      true
    );
  });

  it("detects Context.Tag anti-pattern", async () => {
    const source = `
      import { Context } from "effect";
      const MyService = Context.Tag<MyService>("MyService");
    `;
    const result = await analyze(source);
    expect(
      result.suggestions.some((s) => s.id === "context-tag-anti-pattern")
    ).toBe(true);
  });

  it("detects Promise.all in Effect code", async () => {
    const source = `
      import { Effect } from "effect";
      export const task = Effect.gen(function*() {
        const results = await Promise.all([fetch("/a"), fetch("/b")]);
        return results;
      });
    `;
    const result = await analyze(source);
    expect(
      result.suggestions.some((s) => s.id === "promise-all-in-effect")
    ).toBe(true);
  });

  it("detects console.log in Effect code", async () => {
    const source = `
      import { Effect } from "effect";
      export const task = Effect.gen(function*() {
        console.log("debug message");
        return 42;
      });
    `;
    const result = await analyze(source);
    expect(
      result.suggestions.some((s) => s.id === "console-log-in-effect")
    ).toBe(true);
  });

  it("detects Effect.runSync usage", async () => {
    const source = `
      import { Effect } from "effect";
      const result = Effect.runSync(Effect.succeed(42));
    `;
    const result = await analyze(source);
    expect(
      result.suggestions.some((s) => s.id === "effect-runSync-unsafe")
    ).toBe(true);
  });

  it("detects Effect.gen without yield*", async () => {
    const source = `
      import { Effect } from "effect";
      const wasteful = Effect.gen(function*() {
        return 42;
      });
    `;
    const result = await analyze(source);
    expect(
      result.suggestions.some((s) => s.id === "effect-gen-no-yield")
    ).toBe(true);
  });

  it("detects JSON.parse without Schema", async () => {
    const source = `
      import { Effect } from "effect";
      export const task = Effect.gen(function*() {
        const data = JSON.parse(rawString);
        return data;
      });
    `;
    const result = await analyze(source);
    expect(
      result.suggestions.some((s) => s.id === "schema-decode-unknown")
    ).toBe(true);
  });

  it("does not flag JSON.parse when Schema is imported", async () => {
    const source = `
      import { Effect, Schema } from "effect";
      export const task = Effect.gen(function*() {
        const data = JSON.parse(rawString);
        return data;
      });
    `;
    const result = await analyze(source);
    expect(
      result.suggestions.some((s) => s.id === "schema-decode-unknown")
    ).toBe(false);
  });
});
