/**
 * Pattern Ingestion Pipeline
 *
 * Parses MDX patterns and roadmaps, validates data, and inserts into Postgres.
 */

import type { FileSystem, Path } from '@effect/platform';
import { NodeContext } from '@effect/platform-node';
import { Effect } from 'effect';
import { MdxConfigService, MdxService, type MdxServiceSchema } from 'effect-mdx';
import { db } from '../db/client.js';
import type { NewPattern, NewPatternModulePlacement } from '../db/schema.js';
import { patternModulePlacements, patterns } from '../db/schema.js';
import { parseAllPatterns } from './pattern-parser.js';
import { parseAllRoadmaps } from './roadmap-parser.js';

/**
 * Validate referential integrity
 *
 * Ensures:
 * - All related pattern IDs exist
 * - All roadmap pattern IDs exist
 */
const validateData = (
  parsedPatterns: NewPattern[],
  parsedPlacements: NewPatternModulePlacement[]
): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    const patternIds = new Set(parsedPatterns.map((p) => p.id));
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check related patterns
    for (const pattern of parsedPatterns) {
      if (pattern.related) {
        for (const relatedId of pattern.related) {
          if (!patternIds.has(relatedId)) {
            errors.push(
              `Pattern ${pattern.id} references unknown related pattern: ${relatedId}`
            );
          }
        }
      }
    }

    // Check roadmap placements
    for (const placement of parsedPlacements) {
      if (!patternIds.has(placement.patternId)) {
        errors.push(
          `Roadmap ${placement.moduleId} references unknown pattern: ${placement.patternId}`
        );
      }
    }

    // Check for patterns without placements
    const placedPatternIds = new Set(parsedPlacements.map((p) => p.patternId));
    for (const pattern of parsedPatterns) {
      if (!placedPatternIds.has(pattern.id)) {
        warnings.push(`Pattern ${pattern.id} is not placed in any module`);
      }
    }

    // Log results
    if (warnings.length > 0) {
      yield* Effect.logWarning(`Validation warnings:\n${warnings.join('\n')}`);
    }

    if (errors.length > 0) {
      yield* Effect.logError(`Validation errors:\n${errors.join('\n')}`);
      return yield* Effect.fail(
        new Error(`Validation failed with ${errors.length} errors`)
      );
    }

    yield* Effect.logInfo('Validation passed');
  });

/**
 * Insert patterns into database
 */
const insertPatterns = (
  parsedPatterns: NewPattern[]
): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    yield* Effect.logInfo('Inserting patterns into database...');

    // Delete existing patterns (cascade will delete placements)
    yield* Effect.promise(() => db.delete(patterns));

    // Insert new patterns
    yield* Effect.promise(() => db.insert(patterns).values(parsedPatterns));

    yield* Effect.logInfo(`Inserted ${parsedPatterns.length} patterns`);
  });

/**
 * Insert placements into database
 */
const insertPlacements = (
  parsedPlacements: NewPatternModulePlacement[]
): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    yield* Effect.logInfo('Inserting placements into database...');

    // Delete existing placements
    yield* Effect.promise(() => db.delete(patternModulePlacements));

    // Insert new placements
    yield* Effect.promise(() =>
      db.insert(patternModulePlacements).values(parsedPlacements)
    );

    yield* Effect.logInfo(`Inserted ${parsedPlacements.length} placements`);
  });

/**
 * Main ingestion pipeline
 */
export const runIngestion = (
  patternsDir: string,
  roadmapsDir: string
): Effect.Effect<
  void,
  Error,
  FileSystem.FileSystem | Path.Path | MdxServiceSchema
> =>
  Effect.gen(function* () {
    yield* Effect.logInfo('Starting pattern ingestion pipeline...');
    yield* Effect.logInfo(`Patterns directory: ${patternsDir}`);
    yield* Effect.logInfo(`Roadmaps directory: ${roadmapsDir}`);

    // Parse patterns
    yield* Effect.logInfo('\n=== Parsing Patterns ===');
    const parsedPatterns = yield* parseAllPatterns(patternsDir);

    // Parse roadmaps
    yield* Effect.logInfo('\n=== Parsing Roadmaps ===');
    const parsedPlacements = yield* parseAllRoadmaps(roadmapsDir);

    // Validate
    yield* Effect.logInfo('\n=== Validating Data ===');
    yield* validateData(parsedPatterns, parsedPlacements);

    // Insert into database
    yield* Effect.logInfo('\n=== Inserting into Database ===');
    yield* insertPatterns(parsedPatterns);
    yield* insertPlacements(parsedPlacements);

    yield* Effect.logInfo('\n✅ Ingestion complete!');
    yield* Effect.logInfo(`Total patterns: ${parsedPatterns.length}`);
    yield* Effect.logInfo(`Total placements: ${parsedPlacements.length}`);
  });

/**
 * Run ingestion with default paths
 */
export const runDefaultIngestion = (): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    const patternsDir = 'content/published';
    const roadmapsDir = 'roadmap';

    yield* runIngestion(patternsDir, roadmapsDir);
  }).pipe(
    Effect.provide(MdxService.Default),
    Effect.provide(MdxConfigService.Default),
    Effect.provide(NodeContext.layer)
  );
