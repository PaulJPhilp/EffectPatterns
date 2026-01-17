/**
 * Install Service Implementation
 */

import { FileSystem } from "@effect/platform";
import { Context, Effect, Layer } from "effect";
import { InstalledRule, InstallService, Rule } from "./api.js";

const INSTALLED_STATE_FILE = ".ep-installed.json";

// Mock Rules for initial implementation - will be replaced by actual registry/API
export const MOCK_RULES: Rule[] = [
  {
    id: "error-management",
    title: "Error Recovery Pattern",
    description: "Best practices for handling errors in Effect",
    skillLevel: "beginner",
    useCase: ["error-management"],
    content: "Content v1.0",
  },
  {
    id: "concurrency",
    title: "Concurrency Control",
    description: "Managing concurrent tasks safely",
    skillLevel: "intermediate",
    useCase: ["concurrency"],
    content: "Content v1.0",
  },
  {
    id: "resource-management",
    title: "Resource Management",
    description: "Safe acquisition and release of resources",
    skillLevel: "advanced",
    useCase: ["resource-management"],
    content: "Content v1.0",
  },
];

export const Install = Context.GenericTag<InstallService>("@services/Install");

export const InstallLive = Layer.effect(
  Install,
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    const loadInstalledRules = () =>
      Effect.gen(function* () {
        const exists = yield* fs.exists(INSTALLED_STATE_FILE);
        if (!exists) return [];

        const content = yield* fs.readFileString(INSTALLED_STATE_FILE);
        try {
          return JSON.parse(content) as InstalledRule[];
        } catch (e) {
          return yield* Effect.fail(new Error(`Failed to parse ${INSTALLED_STATE_FILE}: ${e}`));
        }
      });

    const saveInstalledRules = (rules: InstalledRule[]) =>
      fs.writeFileString(INSTALLED_STATE_FILE, JSON.stringify(rules, null, 2));

    const searchRules = (options: {
      query?: string;
      skillLevel?: string;
      useCase?: string;
    }) =>
      Effect.sync(() => {
        let rules = MOCK_RULES;
        if (options.query) {
          const q = options.query.toLowerCase();
          rules = rules.filter(
            (r) =>
              r.title.toLowerCase().includes(q) ||
              r.description.toLowerCase().includes(q)
          );
        }
        if (options.skillLevel) {
          rules = rules.filter((r) => r.skillLevel === options.skillLevel);
        }
        if (options.useCase) {
          rules = rules.filter((r) => r.useCase?.includes(options.useCase!));
        }
        return rules;
      });

    const fetchRule = (id: string) =>
      Effect.gen(function* () {
        const rule = MOCK_RULES.find((r) => r.id === id);
        if (!rule) {
          return yield* Effect.fail(new Error(`Rule with id ${id} not found`));
        }
        return rule;
      });

    return {
      loadInstalledRules,
      saveInstalledRules,
      searchRules,
      fetchRule,
    };
  })
);
