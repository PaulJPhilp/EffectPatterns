import { Effect, DateTime, Option, Data } from "effect";
import * as Fs from "@effect/platform/FileSystem";
import * as Path from "@effect/platform/Path";
export declare class LLMUsage extends Data.Class<{
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    thinkingTokens: number;
    totalTokens: number;
    estimatedCost: number;
    inputCost: number;
    outputCost: number;
    totalCost: number;
}> {
}
export declare class MetricsData extends Data.Class<{
    command: string;
    startTime: DateTime.DateTime;
    endTime?: DateTime.DateTime;
    duration?: number;
    llmUsage?: LLMUsage;
    error?: {
        type: string;
        message: string;
        stack?: string;
    };
    success: boolean;
    runId?: string;
    promptLength?: number;
    responseLength?: number;
    inputTokens?: number;
    outputTokens?: number;
    modelParameters?: {
        temperature?: number;
        maxTokens?: number;
        topP?: number;
    };
    environment: {
        nodeVersion: string;
        platform: string;
        cwd: string;
    };
}> {
}
export declare class MetricsSummary extends Data.Class<{
    totalCommands: number;
    successfulCommands: number;
    failedCommands: number;
    totalTokens: number;
    totalCost: number;
    averageDuration: number;
    providerStats: Record<string, {
        commands: number;
        tokens: number;
        cost: number;
    }>;
    modelStats: Record<string, {
        commands: number;
        tokens: number;
        cost: number;
    }>;
}> {
}
export declare class MetricsHistory extends Data.Class<{
    runs: MetricsData[];
    summary: MetricsSummary;
}> {
}
export declare class MetricsError extends Data.Error<{
    readonly message: string;
    readonly cause?: unknown;
}> {
}
export interface MetricsService {
    startCommand: (command: string, runId?: string) => Effect.Effect<void>;
    endCommand: () => Effect.Effect<void>;
    recordLLMUsage: (usage: LLMUsage) => Effect.Effect<void>;
    recordError: (error: Error) => Effect.Effect<void>;
    recordPrompt: (prompt: string) => Effect.Effect<void>;
    recordResponse: (response: string) => Effect.Effect<void>;
    recordModelParameters: (parameters: {
        temperature?: number;
        maxTokens?: number;
        topP?: number;
    }) => Effect.Effect<void>;
    reportMetrics: (format: "console" | "json" | "jsonl", outputFile?: string) => Effect.Effect<void>;
    getMetrics: () => Effect.Effect<Option.Option<MetricsData>>;
    getMetricsHistory: () => Effect.Effect<MetricsHistory>;
    saveMetrics: (outputPath?: string) => Effect.Effect<void>;
    clearMetrics: () => Effect.Effect<void>;
}
declare const MetricsService_base: Effect.Service.Class<MetricsService, "MetricsService", {
    readonly effect: Effect.Effect<{
        startCommand: (command: string, runId?: string) => Effect.Effect<void, import("@effect/platform/Error").PlatformError | MetricsError, Fs.FileSystem | Path.Path>;
        endCommand: () => Effect.Effect<void, import("@effect/platform/Error").PlatformError | MetricsError, Fs.FileSystem | Path.Path>;
        recordLLMUsage: (usage: LLMUsage) => Effect.Effect<void, import("@effect/platform/Error").PlatformError | MetricsError, Fs.FileSystem | Path.Path>;
        recordError: (error: Error) => Effect.Effect<void, import("@effect/platform/Error").PlatformError | MetricsError, Fs.FileSystem | Path.Path>;
        recordPrompt: (prompt: string) => Effect.Effect<void, import("@effect/platform/Error").PlatformError | MetricsError, Fs.FileSystem | Path.Path>;
        recordResponse: (response: string) => Effect.Effect<void, import("@effect/platform/Error").PlatformError | MetricsError, Fs.FileSystem | Path.Path>;
        recordModelParameters: (parameters: {
            temperature?: number;
            maxTokens?: number;
            topP?: number;
        }) => Effect.Effect<void, import("@effect/platform/Error").PlatformError | MetricsError, Fs.FileSystem | Path.Path>;
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
