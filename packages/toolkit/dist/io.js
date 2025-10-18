/**
 * IO Operations using Effect
 *
 * Effect-based file system operations for loading patterns data.
 */
import { FileSystem } from '@effect/platform/FileSystem';
import { layer as NodeFileSystemLayer } from '@effect/platform-node/NodeFileSystem';
import { Schema as S } from '@effect/schema';
import { Effect } from 'effect';
import { PatternsIndex } from './schemas/pattern.js';
/**
 * Load and parse patterns from a JSON file
 *
 * @param filePath - Absolute path to patterns.json
 * @returns Effect that yields validated PatternsIndex
 */
export const loadPatternsFromJson = (filePath) => Effect.gen(function* () {
    const fs = yield* FileSystem;
    // Read file as UTF-8 string
    const content = yield* fs.readFileString(filePath);
    // Parse JSON
    const json = JSON.parse(content);
    // Validate and decode using Effect schema
    const decoded = yield* S.decode(PatternsIndex)(json);
    return decoded;
}).pipe(Effect.catchAll((error) => Effect.fail(new Error(String(error)))));
/**
 * Runnable version with Node FileSystem layer
 */
export const loadPatternsFromJsonRunnable = (filePath) => loadPatternsFromJson(filePath).pipe(Effect.provide(NodeFileSystemLayer));
//# sourceMappingURL=io.js.map