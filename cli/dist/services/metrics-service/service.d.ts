import { Effect, Option } from "effect";
import * as Fs from "@effect/platform/FileSystem";
import * as Path from "@effect/platform/Path";
import { LLMUsage, MetricsData, MetricsHistory } from "./types.js";
import { MetricsError } from "./errors.js";
declare const MetricsService_base: Effect.Service.Class<MetricsService, "MetricsService", {
    readonly effect: Effect.Effect<{
        startCommand: (command: string, runId?: string) => Effect.Effect<void, import("@effect/platform/Error").PlatformError | MetricsError, Fs.FileSystem | Path.Path>;
        endCommand: () => Effect.Effect<void, import("@effect/platform/Error").PlatformError | MetricsError, Fs.FileSystem | Path.Path>;
        recordLLMUsage: (usage: LLMUsage) => Effect.Effect<void, import("@effect/platform/Error").PlatformError | MetricsError, Fs.FileSystem | Path.Path>;
        recordError: (error: Error) => Effect.Effect<void, import("@effect/platform/Error").PlatformError | MetricsError, Fs.FileSystem | Path.Path>;
        recordResponse: (response: string) => Effect.Effect<void, import("@effect/platform/Error").PlatformError | MetricsError, Fs.FileSystem | Path.Path>;
        recordModelParameters: (parameters: {
            temperature?: number;
            maxTokens?: number;
            topP?: number;
        }) => Effect.Effect<void, import("@effect/platform/Error").PlatformError | MetricsError, Fs.FileSystem | Path.Path>;
        extractLLMUsage: (response: any, provider: any, model: any) => Effect.Effect<LLMUsage, never, never>;
        saveCommandMetrics: (outputPath: any, format?: string) => Effect.Effect<void, import("@effect/platform/Error").PlatformError, Fs.FileSystem | Path.Path>;
        getMetrics: () => Effect.Effect<Option.Option<MetricsData>, import("@effect/platform/Error").PlatformError, Fs.FileSystem | Path.Path>;
        getMetricsHistory: () => Effect.Effect<MetricsHistory, import("@effect/platform/Error").PlatformError, Fs.FileSystem | Path.Path>;
        reportMetrics: (format: "console" | "json" | "jsonl", outputFile?: string) => Effect.Effect<void, import("@effect/platform/Error").PlatformError, Fs.FileSystem | Path.Path>;
        saveMetrics: (outputPath?: string) => Effect.Effect<void, import("@effect/platform/Error").PlatformError, Fs.FileSystem | Path.Path>;
        clearMetrics: () => Effect.Effect<void, import("@effect/platform/Error").PlatformError | MetricsError, Fs.FileSystem | Path.Path>;
    }, never, never>;
    readonly dependencies: readonly [];
}>;
export declare class MetricsService extends MetricsService_base {
}
export declare const estimateCost: (provider: string, model: string, totalTokens: number) => number;
export declare const countTokens: (text: string) => number;
export {};
