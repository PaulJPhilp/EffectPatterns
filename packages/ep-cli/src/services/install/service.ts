/**
 * Install Service Implementation
 *
 * Reads patterns from the Effect Patterns Database (PostgreSQL)
 * via the toolkit repository, then maps them to local Rule objects.
 */

import { FileSystem } from "@effect/platform";
import { EffectPatternRepositoryService } from "@effect-patterns/toolkit";
import { Effect, Schema } from "effect";
import type { InstalledRule, InstallService, Rule } from "./api.js";
import { InstalledRuleSchema } from "./api.js";

const INSTALLED_STATE_FILE = ".ep-installed.json";

/**
 * Map a DB EffectPattern row to a local Rule.
 */
const dbPatternToRule = (p: {
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly skillLevel: string;
  readonly useCases: string[] | null;
  readonly content: string | null;
}): Rule => ({
  id: p.slug,
  title: p.title,
  description: p.summary,
  skillLevel: p.skillLevel,
  useCase: p.useCases ?? [],
  content: p.content ?? p.summary,
});

/**
 * Install service using Effect.Service pattern
 */
export class Install extends Effect.Service<Install>()("Install", {
  accessors: true,
  effect: Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const repo = yield* EffectPatternRepositoryService;

    const InstalledRulesArraySchema = Schema.Array(InstalledRuleSchema);

    const loadInstalledRules = () =>
      Effect.gen(function* () {
        const exists = yield* fs.exists(INSTALLED_STATE_FILE);
        if (!exists) return [];

        const content = yield* fs.readFileString(INSTALLED_STATE_FILE);
        const parsed = yield* Effect.try({
          try: () => JSON.parse(content) as unknown,
          catch: (e) => new Error(`Failed to parse ${INSTALLED_STATE_FILE}: ${e}`),
        });
        const rules = yield* Schema.decodeUnknown(InstalledRulesArraySchema)(parsed).pipe(
          Effect.mapError((e) => new Error(`Invalid ${INSTALLED_STATE_FILE} schema: ${e}`)),
        );
        return rules as InstalledRule[];
      });

    const saveInstalledRules = (rules: InstalledRule[]) =>
      fs.writeFileString(INSTALLED_STATE_FILE, JSON.stringify(rules, null, 2));

    const searchRules = (options: {
      query?: string;
      skillLevel?: string;
      useCase?: string;
    }) =>
      Effect.gen(function* () {
        const results = yield* Effect.tryPromise({
          try: () =>
            repo.search({
              query: options.query,
              skillLevel: options.skillLevel as "beginner" | "intermediate" | "advanced" | undefined,
            }),
          catch: (e) => new Error(`Failed to search patterns: ${e}`),
        });

        let rules = results.map(dbPatternToRule);

        if (options.useCase) {
          rules = rules.filter((r) => r.useCase?.includes(options.useCase!));
        }

        return rules;
      });

    const fetchRule = (id: string) =>
      Effect.gen(function* () {
        const pattern = yield* Effect.tryPromise({
          try: () => repo.findBySlug(id),
          catch: (e) => new Error(`Failed to fetch pattern: ${e}`),
        });

        if (!pattern) {
          return yield* Effect.fail(new Error(`Rule with id ${id} not found`));
        }

        return dbPatternToRule(pattern);
      });

    return {
      loadInstalledRules,
      saveInstalledRules,
      searchRules,
      fetchRule,
    } as InstallService;
  }),
  dependencies: [EffectPatternRepositoryService.Default],
}) {}
