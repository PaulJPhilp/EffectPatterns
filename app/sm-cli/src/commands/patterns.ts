/**
 * Pattern Management Commands
 */

import {
  createDatabase,
  createEffectPatternRepository,
} from "@effect-patterns/toolkit";
import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import {
  formatUploadResultsHuman,
  formatUploadResultsJson,
} from "../formatters/index.js";
import { displayError, displayOutput } from "../helpers/index.js";
import {
  loadConfig,
  makeSupermemoryService,
  saveConfig,
} from "../services/index.js";
import type { Pattern, UploadResult } from "../types.js";

/**
 * Load a single pattern from database
 */
function loadPattern(patternId: string): Effect.Effect<Pattern, Error> {
  return Effect.gen(function* () {
    const { db, close } = createDatabase();
    const repo = createEffectPatternRepository(db);

    try {
      const dbPattern = yield* Effect.tryPromise({
        try: () => repo.findBySlug(patternId),
        catch: (error) => new Error(`Failed to load pattern: ${error}`),
      });

      if (!dbPattern) {
        return yield* Effect.fail(new Error(`Pattern not found: ${patternId}`));
      }

      return {
        id: dbPattern.slug,
        title: dbPattern.title,
        summary: dbPattern.summary,
        skillLevel: dbPattern.skillLevel,
        tags: (dbPattern.tags as string[]) || [],
        useCase: (dbPattern.useCases as string[]) || [],
        content: (dbPattern.content || "").substring(0, 10000),
      } as Pattern;
    } finally {
      yield* Effect.tryPromise({
        try: () => close(),
        catch: () => undefined,
      }).pipe(Effect.ignore);
    }
  });
}

/**
 * Load all patterns from database
 */
function loadAllPatterns(): Effect.Effect<Pattern[], Error> {
  return Effect.gen(function* () {
    const { db, close } = createDatabase();
    const repo = createEffectPatternRepository(db);

    try {
      const dbPatterns = yield* Effect.tryPromise({
        try: () => repo.findAll(),
        catch: (error) => new Error(`Failed to load patterns: ${error}`),
      });

      return dbPatterns.map((dbPattern) => ({
        id: dbPattern.slug,
        title: dbPattern.title,
        summary: dbPattern.summary,
        skillLevel: dbPattern.skillLevel,
        tags: (dbPattern.tags as string[]) || [],
        useCase: (dbPattern.useCases as string[]) || [],
        content: (dbPattern.content || "").substring(0, 10000),
      })) as Pattern[];
    } finally {
      yield* Effect.tryPromise({
        try: () => close(),
        catch: () => undefined,
      }).pipe(Effect.ignore);
    }
  });
}

const formatOption = Options.choice("format", ["human", "json"] as const).pipe(
  Options.withDefault("human" as const)
);

/**
 * Upload a pattern to Supermemory
 */
export const patternsUpload = Command.make(
  "upload",
  {
    patternId: Options.optional(Options.text("patternId")),
    all: Options.boolean("all"),
    format: formatOption,
  },
  (options) =>
    Effect.gen(function* () {
      const config = yield* loadConfig;

      const results: UploadResult[] = [];

      const supermemoryService = yield* makeSupermemoryService(
        config.apiKey
      ).pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* displayError(
              `Failed to initialize Supermemory service: ${error.message}`
            );
            return yield* Effect.fail(error);
          })
        )
      );

      if (options.all) {
        // Upload all patterns from database
        const patterns = yield* loadAllPatterns().pipe(
          Effect.catchAll(() => Effect.succeed([] as Pattern[]))
        );

        for (const pattern of patterns) {
          const patternId = pattern.id;

          const memoryData = {
            type: "effect_pattern",
            patternId: pattern.id,
            title: pattern.title,
            skillLevel: pattern.skillLevel,
            summary: pattern.summary,
            tags: pattern.tags,
            content: pattern.content,
            timestamp: new Date().toISOString(),
            userId: "system:patterns",
          };

          const memoryId = yield* supermemoryService
            .addMemory(JSON.stringify(memoryData), {
              type: "effect_pattern",
              patternId: pattern.id,
              title: pattern.title,
              skillLevel: pattern.skillLevel,
              tags: pattern.tags.join(","),
              userId: "system:patterns",
              source: "pattern_seed",
              accessible: "public",
            })
            .pipe(Effect.catchAll(() => Effect.succeed("")));

          results.push({
            patternId,
            memoryId,
            status: memoryId ? "success" : "error",
            message: memoryId ? undefined : "Failed to upload",
          });
        }

        // Update config
        config.uploadedPatterns = results
          .filter((r) => r.status === "success")
          .map((r) => r.patternId);
        config.lastUpload = new Date().toISOString();
        yield* saveConfig(config);
      } else if (options.patternId !== undefined) {
        // Upload single pattern from database
        const patternIdValue =
          typeof options.patternId === "string"
            ? options.patternId
            : options.patternId.toString();
        const pattern = yield* loadPattern(patternIdValue).pipe(
          Effect.catchAll(() => Effect.succeed(null as any))
        );

        if (!pattern) {
          yield* displayError(`Error: Pattern not found: ${patternIdValue}`);
          return;
        }

        const memoryData = {
          type: "effect_pattern",
          patternId: pattern.id,
          title: pattern.title,
          skillLevel: pattern.skillLevel,
          summary: pattern.summary,
          tags: pattern.tags,
          content: pattern.content,
          timestamp: new Date().toISOString(),
          userId: "system:patterns",
        };

        const memoryId = yield* supermemoryService
          .addMemory(JSON.stringify(memoryData), {
            type: "effect_pattern",
            patternId: pattern.id,
            title: pattern.title,
            skillLevel: pattern.skillLevel,
            tags: pattern.tags.join(","),
            userId: "system:patterns",
            source: "pattern_seed",
            accessible: "public",
          })
          .pipe(Effect.catchAll(() => Effect.succeed("")));

        results.push({
          patternId: patternIdValue,
          memoryId,
          status: memoryId ? "success" : "error",
        });
      } else {
        yield* displayError("Error: Specify a pattern ID or use --all flag");
        return;
      }

      // Format output
      if (options.format === "json") {
        yield* displayOutput(formatUploadResultsJson(results), "info");
      } else {
        yield* displayOutput(formatUploadResultsHuman(results), "info");
      }
    })
);

/**
 * Pattern command group
 */
export const patternsCommand = Command.make(
  "patterns",
  {},
  () => Effect.void
).pipe(Command.withSubcommands([patternsUpload]));
