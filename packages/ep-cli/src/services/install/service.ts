/**
 * Install Service Implementation
 */

import { FileSystem } from "@effect/platform";
import { Effect, Schema } from "effect";
import { readFile } from "node:fs/promises";
import { glob } from "glob";
import path from "node:path";
import { PATHS } from "../../constants.js";
import type { InstalledRule, InstallService, Rule } from "./api.js";
import { InstalledRuleSchema } from "./api.js";

const INSTALLED_STATE_FILE = ".ep-installed.json";

/**
 * Install service using Effect.Service pattern
 */
export class Install extends Effect.Service<Install>()("Install", {
  accessors: true,
  effect: Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const projectRoot = PATHS.PROJECT_ROOT;
    type SkillLevel = "beginner" | "intermediate" | "advanced";

    const normalizeKey = (value: string): string =>
      value
        .toLowerCase()
        .replace(/[`"'']/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

    const extractSectionTitles = (markdown: string): string[] => {
      const matches = markdown.match(/^##\s+(.+)$/gm) ?? [];
      return matches.map((line) => line.replace(/^##\s+/, "").trim());
    };

    const buildMetadataIndexes = async (): Promise<{
      byTitleSkill: Map<string, SkillLevel>;
      byTitleUseCases: Map<string, Set<string>>;
    }> => {
      const byTitleSkill = new Map<string, SkillLevel>();
      const byTitleUseCases = new Map<string, Set<string>>();

      const skillFiles: Array<{ file: string; level: SkillLevel }> = [
        { file: path.join(projectRoot, "content/published/rules/beginner.md"), level: "beginner" },
        { file: path.join(projectRoot, "content/published/rules/intermediate.md"), level: "intermediate" },
        { file: path.join(projectRoot, "content/published/rules/advanced.md"), level: "advanced" },
      ];

      for (const { file, level } of skillFiles) {
        const content = await readFile(file, "utf8");
        for (const title of extractSectionTitles(content)) {
          byTitleSkill.set(normalizeKey(title), level);
        }
      }

      const useCaseFiles = await glob(path.join(projectRoot, "content/published/rules/by-use-case/*.md"));
      for (const file of useCaseFiles) {
        const slug = path.basename(file, ".md");
        const content = await readFile(file, "utf8");
        for (const title of extractSectionTitles(content)) {
          const key = normalizeKey(title);
          const set = byTitleUseCases.get(key) ?? new Set<string>();
          set.add(slug);
          byTitleUseCases.set(key, set);
        }
      }

      return { byTitleSkill, byTitleUseCases };
    };

    let metadataCache:
      | {
          byTitleSkill: Map<string, SkillLevel>;
          byTitleUseCases: Map<string, Set<string>>;
        }
      | undefined;

    const getMetadata = async () => {
      if (!metadataCache) {
        metadataCache = await buildMetadataIndexes();
      }
      return metadataCache;
    };

    const sourceDirForTool = (tool?: string): string => {
      const normalized = (tool ?? "cursor").toLowerCase();
      const map: Record<string, string> = {
        agents: "cursor",
        cursor: "cursor",
        windsurf: "windsurf",
        vscode: "cursor",
      };
      return path.join(projectRoot, "content/published/rules", map[normalized] ?? "cursor");
    };

    const readRules = (tool?: string): Effect.Effect<Rule[], Error> =>
      Effect.tryPromise({
        try: async () => {
          const dir = sourceDirForTool(tool);
          const files = await glob(path.join(dir, "*.mdc"));
          const metadata = await getMetadata();

          const rules: Rule[] = [];
          for (const filePath of files) {
            const content = await readFile(filePath, "utf8");
            const id = path.basename(filePath, ".mdc");
            const titleMatch = content.match(/^#\s+(.+)$/m);
            const descriptionMatch = content.match(/^description:\s*(.+)$/m);

            const title = titleMatch?.[1]?.trim() ?? id;
            const titleKey = normalizeKey(title);
            rules.push({
              id,
              title,
              description: descriptionMatch?.[1]?.trim() ?? "Effect pattern rule",
              skillLevel: metadata.byTitleSkill.get(titleKey),
              useCase: Array.from(metadata.byTitleUseCases.get(titleKey) ?? []),
              content,
            });
          }

          // stable ordering for deterministic installs
          return rules.sort((a, b) => a.id.localeCompare(b.id));
        },
        catch: (error) => new Error(`Failed to load published rules: ${error}`),
      });

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
      tool?: string;
    }) =>
      Effect.gen(function* () {
        let rules = yield* readRules(options.tool);
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
        const rules = yield* readRules("cursor");
        const rule = rules.find((r) => r.id === id);
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
    } as InstallService;
  }),
}) {}
