/**
 * IO Operations using Effect
 *
 * Effect-based file system operations for loading patterns data.
 */

import type { FileSystem as FileSystemService } from '@effect/platform/FileSystem';
import { FileSystem } from '@effect/platform/FileSystem';
import { layer as NodeFileSystemLayer } from '@effect/platform-node/NodeFileSystem';
import { Schema as S } from '@effect/schema';
import * as TreeFormatter from '@effect/schema/TreeFormatter';
import { Effect } from 'effect';
import {
  PatternsIndex as PatternsIndexSchema,
  type PatternsIndex as PatternsIndexData,
} from './schemas/pattern.js';

/**
 * Load and parse patterns from a JSON file
 *
 * @param filePath - Absolute path to patterns.json
 * @returns Effect that yields validated PatternsIndex
 */
export const loadPatternsFromJson = (
  filePath: string,
): Effect.Effect<PatternsIndexData, Error, FileSystemService> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem;

    const content = yield* fs.readFileString(filePath).pipe(
      Effect.mapError((error) => new Error(String(error))),
    );

    const json = yield* Effect.try<unknown, Error>({
      try: () => JSON.parse(content),
      catch: (cause) => new Error(`Failed to parse patterns JSON: ${String(cause)}`),
    });

    const decodedEither = S.decodeUnknownEither(PatternsIndexSchema)(json);

    if (decodedEither._tag === 'Left') {
      const message = TreeFormatter.formatErrorSync(decodedEither.left);
      return yield* Effect.fail(new Error(`Invalid patterns index: ${message}`));
    }

    const decoded: PatternsIndexData = decodedEither.right;

    return decoded;
  });

/**
 * Runnable version with Node FileSystem layer
 */
export const loadPatternsFromJsonRunnable = (filePath: string) =>
  Effect.provide(loadPatternsFromJson(filePath), NodeFileSystemLayer);
