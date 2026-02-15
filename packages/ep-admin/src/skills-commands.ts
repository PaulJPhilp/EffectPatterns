/**
 * Skills generation commands for ep-admin
 *
 * Orchestrates AI skills generation for different platforms:
 * - generate: Generate all skills
 * - generate-from-db: Generate skills from database and upsert into skills table
 * - skill-generator: Interactive skill generator
 * - generate-readme: Generate README by skill and use-case
 *
 * NOTE: Skills are generated from database patterns.
 */

import {
    ApplicationPatternRepositoryService,
    DatabaseService,
    DatabaseLayer,
    EffectPatternRepositoryLive,
    EffectPatternRepositoryService,
    type SkillLockedError,
    createApplicationPatternRepository,
    createEffectPatternRepository,
    createSkillRepository,
} from "@effect-patterns/toolkit";
import { Command, Options } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Console, Effect, Option } from "effect";
import { emitError, emitInfo, emitJson } from "./cli/output.js";
import {
    MESSAGES,
} from "./constants.js";
import { configureLoggerFromOptions, globalOptions } from "./global-options.js";
import { Display } from "./services/display/index.js";
import {
    generateCategorySkill,
    generateGeminiSkill,
    patternFromDatabase,
    writeGeminiSkill,
    writeOpenAISkill,
    writeSkill,
} from "./skills/skill-generator.js";

// ============================================
// Pipeline
// ============================================

export interface GenerateFromDbOptions {
  readonly dryRun: boolean;
  readonly writeFiles: boolean;
  readonly category: Option.Option<string>;
}

export interface GenerateFromDbCounts {
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
}

export interface GenerateFromDbReporter {
  readonly info: (message: string) => Effect.Effect<void>;
  readonly error: (message: string) => Effect.Effect<void>;
}

/**
 * Core pipeline: read patterns from DB, generate skills, upsert into skills table.
 *
 * Exported for testability — the command handler delegates to this function.
 */
export const generateSkillsFromDatabase = (
  repos: {
    readonly appPatternRepo: ReturnType<typeof createApplicationPatternRepository>;
    readonly patternRepo: ReturnType<typeof createEffectPatternRepository>;
    readonly skillRepo: ReturnType<typeof createSkillRepository>;
  },
  options: GenerateFromDbOptions,
  reporter: GenerateFromDbReporter = {
    info: (message) => Console.log(message),
    error: (message) => Console.error(message),
  },
): Effect.Effect<GenerateFromDbCounts | undefined, Error, never> =>
  Effect.gen(function* () {
    const { appPatternRepo, patternRepo, skillRepo } = repos;

    // 1. Load all application patterns and effect patterns
    const appPatterns = yield* Effect.tryPromise({
      try: () => appPatternRepo.findAll(),
      catch: (error) => new Error(`Failed to query application patterns: ${error}`),
    });

    const allPatterns = yield* Effect.tryPromise({
      try: () => patternRepo.findAll(),
      catch: (error) => new Error(`Failed to query effect patterns: ${error}`),
    });

    yield* reporter.info(
      `Found ${appPatterns.length} application patterns, ${allPatterns.length} effect patterns`
    );

    // 2. Group effect patterns by applicationPatternId
    const patternsByAppId = new Map<string, typeof allPatterns>();
    for (const p of allPatterns) {
      if (!p.applicationPatternId) continue;
      const existing = patternsByAppId.get(p.applicationPatternId);
      if (existing) {
        existing.push(p);
      } else {
        patternsByAppId.set(p.applicationPatternId, [p]);
      }
    }

    // 3. Filter by --category if set
    const categoryFilter = Option.getOrUndefined(options.category);
    const targetAppPatterns = categoryFilter
      ? appPatterns.filter(ap => ap.slug === categoryFilter)
      : appPatterns;

    if (categoryFilter && targetAppPatterns.length === 0) {
      yield* reporter.error(`No application pattern found with slug: ${categoryFilter}`);
      return undefined;
    }

    // 4. Process each application pattern
    const counts: GenerateFromDbCounts = { created: 0, updated: 0, unchanged: 0, skipped: 0 };
    const projectRoot = process.cwd();

    for (const ap of targetAppPatterns) {
      const dbPatterns = patternsByAppId.get(ap.id);
      if (!dbPatterns || dbPatterns.length === 0) {
        yield* reporter.info(`  ${ap.slug}: no patterns, skipping`);
        continue;
      }

      // Convert DB patterns to PatternContent
      const patternContents = dbPatterns.map(p => patternFromDatabase(p));

      // Generate SKILL.md content
      const content = generateCategorySkill(ap.slug, patternContents);
      const slug = `effect-patterns-${ap.slug}`;
      const name = `Effect-TS Patterns: ${ap.name}`;
      const description = `Effect-TS patterns for ${ap.name.toLowerCase()}. Use when working with ${ap.name.toLowerCase()} in Effect-TS applications.`;

      // Check existing skill
      const existingSkill = yield* Effect.tryPromise({
        try: () => skillRepo.findBySlug(slug),
        catch: (error) => new Error(`Failed to query skill: ${error}`),
      });

      // Skip if locked (validated)
      if (existingSkill?.validated) {
        yield* reporter.info(`  ${slug}: locked (validated), skipping`);
        counts.skipped++;
        continue;
      }

      // Skip if content unchanged
      if (existingSkill && existingSkill.content === content) {
        yield* reporter.info(`  ${slug}: unchanged`);
        counts.unchanged++;
        continue;
      }

      const isNew = !existingSkill;
      const patternIds = dbPatterns.map(p => p.id);

      if (options.dryRun) {
        yield* reporter.info(
          `  ${slug}: would ${isNew ? "create" : "update"} (${dbPatterns.length} patterns)`
        );
        if (isNew) counts.created++;
        else counts.updated++;
        continue;
      }

      // Upsert skill
      const skill = yield* Effect.tryPromise({
        try: () => skillRepo.upsert({
          slug,
          name,
          description,
          category: ap.slug,
          content,
          patternCount: dbPatterns.length,
          applicationPatternId: ap.id,
        }),
        catch: (error) => {
          if ((error as SkillLockedError)._tag === "SkillLockedError") {
            return new Error(`Skill ${slug} is locked`);
          }
          return new Error(`Failed to upsert skill: ${error}`);
        },
      });

      // Link patterns
      yield* Effect.tryPromise({
        try: () => skillRepo.setPatterns(skill.id, patternIds),
        catch: (error) => new Error(`Failed to set patterns for ${slug}: ${error}`),
      });

      if (isNew) {
        yield* reporter.info(`  ${slug}: created (${dbPatterns.length} patterns)`);
        counts.created++;
      } else {
        yield* reporter.info(
          `  ${slug}: updated v${skill.version} (${dbPatterns.length} patterns)`
        );
        counts.updated++;
      }

      // Write files if requested
      if (options.writeFiles) {
        yield* Effect.tryPromise({
          try: async () => {
            await writeSkill(slug, content, projectRoot);
            await writeOpenAISkill(slug, content, projectRoot);
            const geminiContent = generateGeminiSkill(ap.slug, patternContents);
            await writeGeminiSkill(geminiContent, projectRoot);
          },
          catch: (error) => new Error(`Failed to write skill files: ${error}`),
        });
      }
    }

    // 5. Summary
    yield* reporter.info("");
    yield* reporter.info(
      `Summary: ${counts.created} created, ${counts.updated} updated, ${counts.unchanged} unchanged, ${counts.skipped} skipped (locked)`
    );

    return counts;
  });

// ============================================
// Commands
// ============================================

/**
 * skills:generate-from-db - Generate skills from database patterns and upsert into skills table
 */
export const skillsGenerateFromDbCommand = Command.make("generate-from-db", {
    options: {
        ...globalOptions,
        dryRun: Options.boolean("dry-run").pipe(
            Options.withDescription("Preview what would be generated without writing to the database"),
            Options.withDefault(false)
        ),
        writeFiles: Options.boolean("write-files").pipe(
            Options.withDescription("Also write skill files to disk (Claude, OpenAI, Gemini formats)"),
            Options.withDefault(false)
        ),
        category: Options.optional(
            Options.text("category").pipe(
                Options.withDescription("Filter to a specific application pattern slug")
            )
        ),
    },
})
    .pipe(
        Command.withDescription(
            "Generate skills from database patterns and upsert into the skills table"
        ),
        Command.withHandler(({ options }) =>
            Effect.gen(function* () {
                yield* configureLoggerFromOptions(options);

                if (options.dryRun && !options.json) {
                    yield* Display.showInfo(MESSAGES.INFO.DRY_RUN_MODE);
                }

                if (!options.json) {
                    yield* Display.showInfo("Generating skills from database patterns...");
                }

                const counts = yield* Effect.scoped(
                    Effect.gen(function* () {
                        const appPatternRepo = yield* ApplicationPatternRepositoryService;
                        const patternRepo = yield* EffectPatternRepositoryService;
                        const dbService = yield* DatabaseService;
                        const skillRepo = createSkillRepository(dbService.db);
                        const reporter: GenerateFromDbReporter = {
                            info: (message) => emitInfo(message, options.json),
                            error: emitError,
                        };

                        return yield* generateSkillsFromDatabase(
                            { appPatternRepo, patternRepo, skillRepo },
                            {
                                dryRun: options.dryRun,
                                writeFiles: options.writeFiles,
                                category: options.category,
                            },
                            reporter
                        );
                    })
                ).pipe(Effect.provide(DatabaseLayer));

                if (options.json) {
                    yield* emitJson({
                        ok: counts !== undefined,
                        dryRun: options.dryRun,
                        writeFiles: options.writeFiles,
                        counts,
                    });
                    return;
                }

                yield* Display.showSuccess(MESSAGES.SUCCESS.SKILLS_GENERATED_FROM_DB);
            })
        )
    );

/**
 * skills:generate - Generate all skills
 */
export const skillsGenerateCommand = Command.make("generate", {
    options: {
        ...globalOptions,
        format: Options.choice("format", ["json", "markdown", "yaml"])
            .pipe(
                Options.withDescription("Output format"),
                Options.withDefault("json" as const)
            ),
        output: Options.text("output").pipe(
            Options.withDescription("Output file path"),
            Options.withDefault("content/published/skills/skills.json")
        ),
    },
})
    .pipe(
        Command.withDescription(
            "Generate AI skills from patterns for all platforms"
        ),
        Command.withHandler(({ options }) =>
            Effect.gen(function* () {
                yield* configureLoggerFromOptions(options);
                if (!options.json) {
                    yield* Display.showInfo("Generating skills from database...");
                }

                const summary = yield* Effect.scoped(
                    Effect.gen(function* () {
                        const repo = yield* EffectPatternRepositoryService;
                        const patterns = yield* Effect.promise(() => repo.findAll());
                        if (!options.json) {
                            yield* Display.showInfo(`Found ${patterns.length} patterns`);
                        }

                        // Group by skill level
                        const byLevel = {
                            beginner: patterns.filter(p => p.skillLevel === "beginner"),
                            intermediate: patterns.filter(p => p.skillLevel === "intermediate"),
                            advanced: patterns.filter(p => p.skillLevel === "advanced"),
                        };

                        const skills = patterns.map(p => ({
                            id: p.slug,
                            title: p.title,
                            skillLevel: p.skillLevel,
                            summary: p.summary,
                            tags: p.tags || [],
                        }));

                        const fs = yield* FileSystem.FileSystem;
                        yield* fs.makeDirectory("content/published/skills", { recursive: true });
                        yield* fs.writeFileString(options.output, JSON.stringify(skills, null, 2));

                        if (!options.json) {
                            yield* Display.showInfo(`\nSkills by level:`);
                            yield* Display.showInfo(`  Beginner: ${byLevel.beginner.length}`);
                            yield* Display.showInfo(`  Intermediate: ${byLevel.intermediate.length}`);
                            yield* Display.showInfo(`  Advanced: ${byLevel.advanced.length}`);
                            yield* Display.showInfo(`\nOutput: ${options.output}`);
                        }

                        return {
                            total: patterns.length,
                            byLevel: {
                                beginner: byLevel.beginner.length,
                                intermediate: byLevel.intermediate.length,
                                advanced: byLevel.advanced.length,
                            },
                            output: options.output,
                            format: options.format,
                        };
                    })
                ).pipe(Effect.provide(EffectPatternRepositoryLive));

                if (options.json) {
                    yield* emitJson({ ok: true, summary });
                    return;
                }

                yield* Display.showSuccess(MESSAGES.SUCCESS.SKILLS_GENERATED);
            })
        )
    );

/**
 * skills:skill-generator - Interactive skill generator
 */
export const skillsSkillGeneratorCommand = Command.make("skill-generator", {
    options: {
        ...globalOptions,
    },
})
    .pipe(
        Command.withDescription(
            "Interactive generator for creating individual skills from patterns"
        ),
        Command.withHandler(({ options }) =>
            Effect.gen(function* () {
                yield* configureLoggerFromOptions(options);
                if (options.json) {
                    yield* emitJson({
                        ok: true,
                        command: "skill-generator",
                        message:
                            "Use `ep-admin pattern skills generate` or `ep-admin pattern skills generate-readme`.",
                    });
                    return;
                }

                yield* Display.showInfo("Interactive Skill Generator");

                yield* Display.showInfo(
                    "\nTo generate skills interactively:\n" +
                    "  1. Use 'ep-admin skills generate' to generate all skills\n" +
                    "  2. Use 'ep-admin skills generate-readme' for README by skill level\n" +
                    "\nOr use the web interface at the Effect Patterns Hub."
                );

                yield* Display.showSuccess(MESSAGES.SUCCESS.SKILL_GENERATION_COMPLETED);
            })
        )
    );

/**
 * skills:generate-readme - Generate README by skill/usecase
 */
export const skillsGenerateReadmeCommand = Command.make("generate-readme", {
    options: {
        ...globalOptions,
        skillLevel: Options.optional(
            Options.text("skill-level").pipe(
                Options.withDescription("Filter by skill level (beginner, intermediate, advanced)")
            )
        ),
        useCase: Options.optional(
            Options.text("use-case").pipe(
                Options.withDescription("Filter by use case")
            )
        ),
    },
})
    .pipe(
        Command.withDescription(
            "Generate README organized by skill level and use case"
        ),
        Command.withHandler(({ options }) =>
            Effect.gen(function* () {
                yield* configureLoggerFromOptions(options);
                if (!options.json) {
                    yield* Display.showInfo("Generating README by skill level...");
                }

                const result = yield* Effect.scoped(
                    Effect.gen(function* () {
                        const repo = yield* EffectPatternRepositoryService;
                        let patterns = yield* Effect.promise(() => repo.findAll());

                        // Apply filters
                         const skillLevelFilter = Option.getOrUndefined(options.skillLevel);
                         if (skillLevelFilter) {
                             patterns = patterns.filter(
                                 p => p.skillLevel.toLowerCase() === skillLevelFilter.toLowerCase()
                             );
                             if (!options.json) {
                                 yield* Display.showInfo(`Filtered to ${skillLevelFilter}: ${patterns.length} patterns`);
                             }
                         }

                        // Generate README content
                        const sections: string[] = [];
                        sections.push("# Effect Patterns by Skill Level\n");

                        const levels = ["beginner", "intermediate", "advanced"];
                        for (const level of levels) {
                            const levelPatterns = patterns.filter(
                                p => p.skillLevel.toLowerCase() === level
                            );

                            if (levelPatterns.length > 0) {
                                const emoji = level === "beginner" ? "🟢" :
                                    level === "intermediate" ? "🟡" : "🟠";
                                sections.push(`## ${emoji} ${level.charAt(0).toUpperCase() + level.slice(1)}\n`);

                                for (const p of levelPatterns) {
                                    sections.push(`- **${p.title}**: ${p.summary}`);
                                }
                                sections.push("");
                            }
                        }

                        const fs = yield* FileSystem.FileSystem;
                        const output = "content/published/skills/README.md";
                        yield* fs.makeDirectory("content/published/skills", { recursive: true });
                        yield* fs.writeFileString(output, sections.join("\n"));

                        if (!options.json) {
                            yield* Display.showInfo(`\nGenerated README with ${patterns.length} patterns`);
                            yield* Display.showInfo(`Output: ${output}`);
                        }

                        return {
                            output,
                            patternCount: patterns.length,
                            skillLevel: Option.getOrUndefined(options.skillLevel),
                            useCase: Option.getOrUndefined(options.useCase),
                        };
                    })
                ).pipe(Effect.provide(EffectPatternRepositoryLive));

                if (options.json) {
                    yield* emitJson({ ok: true, result });
                    return;
                }

                yield* Display.showSuccess(MESSAGES.SUCCESS.README_GENERATED);
            })
        )
    );

/**
 * Compose all skills commands into a single command group
 */
export const skillsCommand = Command.make("skills").pipe(
    Command.withDescription("AI skills generation and management"),
    Command.withSubcommands([
        skillsGenerateCommand,
        skillsGenerateFromDbCommand,
        skillsSkillGeneratorCommand,
        skillsGenerateReadmeCommand,
    ])
);
