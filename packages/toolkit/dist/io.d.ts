/**
 * IO Operations using Effect
 *
 * Effect-based file system operations for loading patterns data.
 */
import type { FileSystem as FileSystemService } from '@effect/platform/FileSystem';
import { Effect } from 'effect';
import { type PatternsIndex as PatternsIndexData } from './schemas/pattern.js';
/**
 * Load and parse patterns from a JSON file
 *
 * @param filePath - Absolute path to patterns.json
 * @returns Effect that yields validated PatternsIndex
 */
export declare const loadPatternsFromJson: (filePath: string) => Effect.Effect<PatternsIndexData, Error, FileSystemService>;
/**
 * Runnable version with Node FileSystem layer
 */
export declare const loadPatternsFromJsonRunnable: (filePath: string) => Effect.Effect<{
    readonly patterns: readonly {
        readonly effectVersion?: string | undefined;
        readonly title: string;
        readonly category: "error-handling" | "concurrency" | "data-transformation" | "testing" | "services" | "streams" | "caching" | "observability" | "scheduling" | "resource-management";
        readonly difficulty: "beginner" | "intermediate" | "advanced";
        readonly id: string;
        readonly description: string;
        readonly tags: readonly string[];
        readonly examples: readonly {
            readonly description?: string | undefined;
            readonly language: string;
            readonly code: string;
        }[];
        readonly useCases: readonly string[];
        readonly relatedPatterns?: readonly string[] | undefined;
        readonly createdAt?: string | undefined;
        readonly updatedAt?: string | undefined;
    }[];
    readonly version?: string | undefined;
    readonly lastUpdated?: string | undefined;
}, Error, FileSystemService>;
//# sourceMappingURL=io.d.ts.map