/**
 * Install Service Tests (real published rules)
 */

import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Install } from "../service.js";

const runInstall = <A>(effect: Effect.Effect<A, unknown, any>) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(Layer.provide(Install.Default, NodeFileSystem.layer))
    ) as Effect.Effect<
      A,
      unknown,
      never
    >
  );

describe("Install Service", () => {
  it("loads published cursor rules", async () => {
    const rules = await runInstall(
      Effect.gen(function* () {
        const install = yield* Install;
        return yield* install.searchRules({ tool: "cursor" });
      })
    );

    expect(rules.length).toBeGreaterThan(200);
    expect(rules[0]).toHaveProperty("id");
    expect(rules[0]).toHaveProperty("title");
    expect(rules[0]).toHaveProperty("description");
    expect(rules[0]).toHaveProperty("content");
  });

  it("loads published windsurf rules", async () => {
    const rules = await runInstall(
      Effect.gen(function* () {
        const install = yield* Install;
        return yield* install.searchRules({ tool: "windsurf" });
      })
    );

    expect(rules.length).toBeGreaterThan(200);
  });

  it("filters rules by query", async () => {
    const rules = await runInstall(
      Effect.gen(function* () {
        const install = yield* Install;
        return yield* install.searchRules({ tool: "cursor", query: "retry" });
      })
    );

    expect(rules.length).toBeGreaterThan(0);
    expect(
      rules.some(
        (r) =>
          r.title.toLowerCase().includes("retry") ||
          r.description.toLowerCase().includes("retry")
      )
    ).toBe(true);
  });

  it("finds a rule by id", async () => {
    const rule = await runInstall(
      Effect.gen(function* () {
        const install = yield* Install;
        return yield* install.fetchRule("retry-failed-operations");
      })
    );

    expect(rule.id).toBe("retry-failed-operations");
    expect(rule.content.length).toBeGreaterThan(0);
  });
});
