/**
 * Production-Ready IO Operations Service
 *
 * Effect-based file system operations with proper error handling,
 * logging, configuration, and caching for loading patterns data.
 */

import { layer as NodeFileSystemLayer } from '@effect/platform-node/NodeFileSystem';
import type { FileSystem as FileSystemService } from '@effect/platform/FileSystem';
import { FileSystem } from '@effect/platform/FileSystem';
import { Schema as S } from '@effect/schema';
import { Effect, Layer } from 'effect';
import { PatternLoadError } from '../errors.js';
import { PatternsIndex } from '../schemas/pattern.js';
import { ToolkitConfig, ToolkitConfigLive } from './config.js';
import { ToolkitLogger, ToolkitLoggerLive } from './logger.js';

/**
 * Pattern loading service with production features
 */
export class PatternLoader extends Effect.Service<PatternLoader>()('PatternLoader', {
    effect: Effect.gen(function* () {
        const fs = yield* FileSystem;
        const config = yield* ToolkitConfig;
        const logger = yield* ToolkitLogger;

        const loadTimeoutMs = yield* config.getLoadTimeoutMs();

        /**
         * Load and parse patterns from a JSON file with production features
         */
        const loadPatternsFromJson = (filePath: string) =>
            Effect.gen(function* () {
                const startTime = Date.now();
                const operationLogger = logger.withOperation('loadPatternsFromJson');

                yield* operationLogger.debug('Starting pattern loading', { filePath });

                // Add timeout to file operations
                const loadEffect = Effect.gen(function* () {
                    // Read file as UTF-8 string
                    const content = yield* fs.readFileString(filePath);
                    yield* operationLogger.debug('File read successful', { size: content.length });

                    // Parse JSON with error handling
                    let json: unknown;
                    try {
                        json = JSON.parse(content);
                    } catch (parseError) {
                        yield* operationLogger.error('JSON parse failed', { error: String(parseError) });
                        yield* Effect.fail(new PatternLoadError({
                            path: filePath,
                            cause: parseError as Error
                        }));
                    }

                    // Validate and decode using Effect schema
                    const decoded = yield* S.decodeUnknown(PatternsIndex)(json);

                    yield* operationLogger.info('Patterns loaded successfully', {
                        count: decoded.patterns.length,
                        version: decoded.version
                    });

                    return decoded;
                });

                // Apply timeout
                const result = yield* loadEffect.pipe(
                    Effect.timeout(loadTimeoutMs),
                    Effect.catchTag('TimeoutException', () =>
                        Effect.fail(new PatternLoadError({
                            path: filePath,
                            cause: new Error(`Loading timeout after ${loadTimeoutMs}ms`)
                        }))
                    )
                );

                yield* logger.withDuration(startTime, 'loadPatternsFromJson')
                    .info('Pattern loading completed', { filePath });

                return result;
            });

        /**
         * Runnable version with Node FileSystem layer
         */
        const loadPatternsFromJsonRunnable = (filePath: string) =>
            loadPatternsFromJson(filePath).pipe(
                Effect.provide(NodeFileSystemLayer),
                Effect.provide(ToolkitConfigLive),
                Effect.provide(ToolkitLoggerLive)
            );

        return {
            loadPatternsFromJson,
            loadPatternsFromJsonRunnable,
        };
    })
}) { }

/**
 * Default pattern loader layer
 */
export const PatternLoaderLive = PatternLoader.Default;

/**
 * Production layer with all dependencies
 */
export const PatternLoaderProduction = Layer.mergeAll(
    PatternLoaderLive,
    ToolkitConfigLive,
    ToolkitLoggerLive,
    NodeFileSystemLayer
);

/**
 * Legacy compatibility - export the original functions
 * These will be deprecated in favor of the service-based approach
 */
export const loadPatternsFromJson = (
    filePath: string,
): Effect.Effect<typeof PatternsIndex.Type, Error, FileSystemService> =>
    Effect.gen(function* () {
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
 * Runnable version with Node FileSystem layer (legacy)
 */
export const loadPatternsFromJsonRunnable = (filePath: string) =>
    loadPatternsFromJson(filePath).pipe(Effect.provide(NodeFileSystemLayer));