/**
 * Pattern Management Commands
 */

import { Effect, Option } from "effect";
import { Command, Options, Args } from "@effect/cli";
import * as fs from "fs";
import * as path from "path";
import { loadConfig, saveConfig } from "../services/index.js";
import { SupermemoryService } from "../services/index.js";
import {
  displayOutput,
  displayJson,
  displayError,
  displaySuccess,
} from "../helpers/index.js";
import {
  formatUploadResultsHuman,
  formatUploadResultsJson,
} from '../formatters/index.js';
import type { UploadResult, Pattern } from '../types.js';

/**
 * Load a single pattern from file
 */
function loadPattern(patternId: string, patternsDir: string): Effect.Effect<Pattern, Error> {
  return Effect.gen(function* () {
    const filePath = path.join(patternsDir, `${patternId}.mdx`);

    const exists = yield* Effect.sync(() => fs.existsSync(filePath));
    if (!exists) {
      return yield* Effect.fail(new Error(`Pattern file not found: ${filePath}`));
    }

    const content = yield* Effect.tryPromise({
      try: () => fs.promises.readFile(filePath, 'utf-8'),
      catch: (error) => new Error(`Failed to read pattern: ${error}`),
    });

    // Parse frontmatter (simplified - assumes YAML between ---)
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) {
      return yield* Effect.fail(new Error('Invalid pattern format: missing frontmatter'));
    }

    // Parse YAML frontmatter (very simplified)
    const fm = fmMatch[1];
    const title = fm.match(/title:\s*(.+)/)?.[1] || patternId;
    const summary = fm.match(/summary:\s*(.+)/)?.[1] || '';
    const skillLevel = fm.match(/skillLevel:\s*(.+)/)?.[1] || 'intermediate';

    return {
      id: patternId,
      title: title.trim(),
      summary: summary.trim(),
      skillLevel: skillLevel.trim(),
      tags: [],
      useCase: [],
      content: content.substring(0, 10000),
    } as Pattern;
  });
}

const formatOption = Options.choice('format', ['human', 'json'] as const)
  .pipe(Options.withDefault('human' as const));

/**
 * Upload a pattern to Supermemory
 */
export const patternsUpload = Command.make(
  'upload',
  {
    patternId: Options.optional(Options.text('patternId')),
    all: Options.boolean('all'),
    format: formatOption,
  },
  (options) =>
    Effect.gen(function* () {
      const config = yield* loadConfig;

      // Get patterns directory
      const patternsDir = path.join(
        process.cwd(),
        '../../content/published',
      );

      const results: UploadResult[] = [];

      let supermemoryService: any;
      try {
        supermemoryService = yield* SupermemoryServiceLive(config.apiKey);
      } catch (e) {
        console.error('Failed to initialize Supermemory service:', e);
        return;
      }

      if (options.all) {
        // Upload all patterns
        const files = yield* Effect.sync(() =>
          fs.readdirSync(patternsDir).filter((f) => f.endsWith('.mdx')),
        );

        for (const file of files) {
          const patternId = file.replace('.mdx', '');

          const pattern = yield* loadPattern(patternId, patternsDir).pipe(
            Effect.catchAll(() => Effect.succeed(null as any)),
          );

          if (!pattern) {
            results.push({
              patternId,
              memoryId: '',
              status: 'error',
              message: 'Failed to load pattern file',
            });
            continue;
          }

          const memoryData = {
            type: 'effect_pattern',
            patternId: pattern.id,
            title: pattern.title,
            skillLevel: pattern.skillLevel,
            summary: pattern.summary,
            tags: pattern.tags,
            content: pattern.content,
            timestamp: new Date().toISOString(),
            userId: 'system:patterns',
          };

          const memoryId = yield* supermemoryService
            .addMemory(JSON.stringify(memoryData), {
              type: 'effect_pattern',
              patternId: pattern.id,
              title: pattern.title,
              skillLevel: pattern.skillLevel,
              tags: pattern.tags.join(','),
              userId: 'system:patterns',
              source: 'pattern_seed',
              accessible: 'public',
            })
            .pipe(Effect.catchAll(() => Effect.succeed('')));

          results.push({
            patternId,
            memoryId,
            status: memoryId ? 'success' : 'error',
            message: memoryId ? undefined : 'Failed to upload',
          });
        }

        // Update config
        config.uploadedPatterns = results
          .filter((r) => r.status === 'success')
          .map((r) => r.patternId);
        config.lastUpload = new Date().toISOString();
        yield* saveConfig(config);
      } else if (options.patternId !== undefined) {
        // Upload single pattern
        const patternIdValue = typeof options.patternId === 'string' ? options.patternId : options.patternId.toString();
        const pattern = yield* loadPattern(patternIdValue, patternsDir).pipe(
          Effect.catchAll(() => Effect.succeed(null as any)),
        );

        if (!pattern) {
          yield* displayError(`Error: Pattern not found: ${patternIdValue}`);
          return;
        }

        const memoryData = {
          type: 'effect_pattern',
          patternId: pattern.id,
          title: pattern.title,
          skillLevel: pattern.skillLevel,
          summary: pattern.summary,
          tags: pattern.tags,
          content: pattern.content,
          timestamp: new Date().toISOString(),
          userId: 'system:patterns',
        };

        const memoryId = yield* supermemoryService
          .addMemory(JSON.stringify(memoryData), {
            type: 'effect_pattern',
            patternId: pattern.id,
            title: pattern.title,
            skillLevel: pattern.skillLevel,
            tags: pattern.tags.join(','),
            userId: 'system:patterns',
            source: 'pattern_seed',
            accessible: 'public',
          })
          .pipe(Effect.catchAll(() => Effect.succeed('')));

        results.push({
          patternId: patternIdValue,
          memoryId,
          status: memoryId ? 'success' : 'error',
        });
      } else {
        yield* displayError('Error: Specify a pattern ID or use --all flag');
        return;
      }

      // Format output
      if (options.format === 'json') {
        yield* displayOutput(formatUploadResultsJson(results), 'info');
      } else {
        yield* displayOutput(formatUploadResultsHuman(results), 'info');
      }
    }),
);

/**
 * Pattern command group
 */
export const patternsCommand = Command.make(
  'patterns',
  {},
  () => Effect.void,
).pipe(
  Command.withSubcommands([
    patternsUpload,
  ]),
);
