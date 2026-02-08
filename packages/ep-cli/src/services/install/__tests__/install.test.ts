/**
 * Install Service Tests (DB-backed patterns)
 *
 * Requires DATABASE_URL to be set — skipped otherwise.
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

describe.skipIf(!process.env.DATABASE_URL)("Install Service", () => {
  it("loads patterns from database", async () => {
    const rules = await runInstall(
      Effect.gen(function* () {
        const install = yield* Install;
        return yield* install.searchRules({});
      })
    );

    expect(rules.length).toBeGreaterThan(100);
    expect(rules[0]).toHaveProperty("id");
    expect(rules[0]).toHaveProperty("title");
    expect(rules[0]).toHaveProperty("description");
    expect(rules[0]).toHaveProperty("content");
  });

  it("filters rules by query", async () => {
    const rules = await runInstall(
      Effect.gen(function* () {
        const install = yield* Install;
        return yield* install.searchRules({ query: "retry" });
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

  it("filters rules by skill level", async () => {
    const rules = await runInstall(
      Effect.gen(function* () {
        const install = yield* Install;
        return yield* install.searchRules({ skillLevel: "beginner" });
      })
    );

    expect(rules.length).toBeGreaterThan(0);
    for (const r of rules) {
      expect(r.skillLevel).toBe("beginner");
    }
  });

  it("finds a rule by id (slug)", async () => {
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
