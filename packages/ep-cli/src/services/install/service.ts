/**
 * Install Service Implementation
 *
 * Reads patterns from the Effect Patterns HTTP API and maps them
 * to local Rule objects.
 */

import { FileSystem } from "@effect/platform";
import { Effect, Schema } from "effect";
import { homedir } from "node:os";
import path from "node:path";
import { PatternApi } from "../pattern-api/index.js";
import type { InstalledRule, InstallService, Rule } from "./api.js";
import { InstalledRuleSchema } from "./api.js";

const resolveInstalledStateFile = () => {
  const explicit = process.env.EP_INSTALLED_STATE_FILE;
  if (explicit && explicit.trim().length > 0) {
    return explicit;
  }

  const stateHome = process.env.XDG_STATE_HOME || path.join(homedir(), ".local", "state");
  return path.join(stateHome, "ep-cli", "installed-rules.json");
};

/**
 * Map an API pattern record to a local Rule.
 */
const apiPatternToRule = (p: {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly difficulty: string;
  readonly useCases?: readonly string[];
}): Rule => ({
  id: p.id,
  title: p.title,
  description: p.description,
  skillLevel: p.difficulty,
  useCase: p.useCases ? [...p.useCases] : [],
  content: p.description,
});

/**
 * Install service using Effect.Service pattern
 */
export class Install extends Effect.Service<Install>()("Install", {
  accessors: true,
  effect: Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const patternApi = yield* PatternApi;

    const InstalledRulesArraySchema = Schema.Array(InstalledRuleSchema);
    const installedStateFile = resolveInstalledStateFile();

    const loadInstalledRules = () =>
      Effect.gen(function* () {
        const exists = yield* fs.exists(installedStateFile);
        if (!exists) return [];

        const content = yield* fs.readFileString(installedStateFile);
        const parsed = yield* Effect.try({
          try: () => JSON.parse(content) as unknown,
          catch: (e) => new Error(`Failed to parse ${installedStateFile}: ${e}`),
        });
        const rules = yield* Schema.decodeUnknown(InstalledRulesArraySchema)(parsed).pipe(
          Effect.mapError((e) => new Error(`Invalid ${installedStateFile} schema: ${e}`)),
        );
        return rules as InstalledRule[];
      });

    const saveInstalledRules = (rules: InstalledRule[]) =>
      Effect.gen(function* () {
        yield* fs.makeDirectory(path.dirname(installedStateFile), { recursive: true });
        yield* fs.writeFileString(installedStateFile, JSON.stringify(rules, null, 2));
      });

    const searchRules = (options: {
      query?: string;
      skillLevel?: string;
      useCase?: string;
    }) =>
      Effect.gen(function* () {
        const results = yield* patternApi.search({
          query: options.query,
          difficulty: options.skillLevel,
        });

        let rules = results.map(apiPatternToRule);

        if (options.useCase) {
          rules = rules.filter((r) => r.useCase?.includes(options.useCase!));
        }

        return rules;
      });

    const fetchRule = (id: string) =>
      Effect.gen(function* () {
        const pattern = yield* patternApi.getById(id);

        if (!pattern) {
          return yield* Effect.fail(new Error(`Rule with id ${id} not found`));
        }

        return apiPatternToRule(pattern);
      });

    return {
      loadInstalledRules,
      saveInstalledRules,
      searchRules,
      fetchRule,
    } as InstallService;
  }),
}) {}
