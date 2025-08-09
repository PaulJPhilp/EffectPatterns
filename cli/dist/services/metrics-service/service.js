import { Effect, DateTime, Console, Option } from "effect";
import * as Fs from "@effect/platform/FileSystem";
import * as Path from "@effect/platform/Path";
import { LLMUsage, MetricsData, MetricsSummary, MetricsHistory } from "./types.js";
import { MetricsError } from "./errors.js";
// Service implementation using Effect.Service pattern
export class MetricsService extends Effect.Service()("MetricsService", {
    effect: Effect.gen(function* () {
        const createEmptySummary = () => new MetricsSummary({
            totalCommands: 0,
            successfulCommands: 0,
            failedCommands: 0,
            totalTokens: 0,
            totalCost: 0,
            averageDuration: 0,
            providerStats: {},
            modelStats: {}
        });
        const getMetricsFilePath = Effect.gen(function* () {
            const path = yield* Path.Path;
            const homeDir = yield* Effect.succeed(process.env.HOME || process.env.USERPROFILE || process.cwd());
            const metricsDir = path.join(homeDir, ".config", "ai-cli");
            return path.join(metricsDir, "metrics.json");
        });
        const readMetricsFile = Effect.gen(function* () {
            const fs = yield* Fs.FileSystem;
            const metricsFile = yield* getMetricsFilePath;
            const exists = yield* fs.exists(metricsFile);
            if (!exists) {
                return new MetricsHistory({ runs: [], summary: createEmptySummary() });
            }
            return yield* fs.readFileString(metricsFile).pipe(Effect.mapError((cause) => new MetricsError({ message: "Failed to read metrics file", cause })), Effect.flatMap((content) => Effect.try({
                try: () => JSON.parse(content),
                catch: (cause) => new MetricsError({ message: "Failed to parse metrics file", cause }),
            })), Effect.catchAll(() => Effect.succeed(new MetricsHistory({ runs: [], summary: createEmptySummary() }))));
        });
        const writeMetricsFile = (history, outputPath) => Effect.gen(function* () {
            const fs = yield* Fs.FileSystem;
            const metricsFile = outputPath || (yield* getMetricsFilePath);
            const path = yield* Path.Path;
            const dir = path.dirname(metricsFile);
            const dirExists = yield* fs.exists(dir);
            if (!dirExists) {
                yield* fs.makeDirectory(dir, { recursive: true });
            }
            yield* fs.writeFileString(metricsFile, JSON.stringify(history, null, 2)).pipe(Effect.mapError((cause) => new MetricsError({ message: "Failed to write metrics file", cause })));
        });
        const calculateSummary = (runs) => {
            const totalCommands = runs.length;
            const successfulCommands = runs.filter(r => r.success).length;
            const failedCommands = totalCommands - successfulCommands;
            const totalTokens = runs.reduce((sum, r) => sum + (r.llmUsage?.totalTokens || 0), 0);
            const totalCost = runs.reduce((sum, r) => sum + (r.llmUsage?.totalCost || 0), 0);
            const totalDuration = runs.reduce((sum, r) => sum + (r.duration || 0), 0);
            const averageDuration = totalCommands > 0 ? totalDuration / totalCommands : 0;
            const providerStats = {};
            const modelStats = {};
            runs.forEach(run => {
                if (run.llmUsage) {
                    const provider = run.llmUsage.provider;
                    const model = run.llmUsage.model;
                    if (!providerStats[provider]) {
                        providerStats[provider] = { commands: 0, tokens: 0, cost: 0 };
                    }
                    providerStats[provider].commands++;
                    providerStats[provider].tokens += run.llmUsage.totalTokens;
                    providerStats[provider].cost += run.llmUsage.totalCost;
                    if (!modelStats[model]) {
                        modelStats[model] = { commands: 0, tokens: 0, cost: 0 };
                    }
                    modelStats[model].commands++;
                    modelStats[model].tokens += run.llmUsage.totalTokens;
                    modelStats[model].cost += run.llmUsage.totalCost;
                }
            });
            return new MetricsSummary({
                totalCommands,
                successfulCommands,
                failedCommands,
                totalTokens,
                totalCost,
                averageDuration,
                providerStats,
                modelStats
            });
        };
        const reportToConsole = (history) => Effect.gen(function* () {
            yield* Console.log("=== METRICS REPORT ===");
            yield* Console.log(`Total Commands: ${history.summary.totalCommands}`);
            yield* Console.log(`Successful: ${history.summary.successfulCommands}`);
            yield* Console.log(`Failed: ${history.summary.failedCommands}`);
            yield* Console.log(`Total Tokens: ${history.summary.totalTokens.toLocaleString()}`);
            yield* Console.log(`Total Cost: $${history.summary.totalCost.toFixed(5)}`);
            yield* Console.log(`Average Duration: ${history.summary.averageDuration.toFixed(0)}ms`);
            yield* Console.log("\nProvider Statistics:");
            for (const [provider, stats] of Object.entries(history.summary.providerStats)) {
                const commands = Number(stats.commands || 0);
                const tokens = Number(stats.tokens || 0);
                const cost = Number(stats.cost || 0);
                yield* Console.log(`  ${provider}: ${commands} commands, ${tokens.toLocaleString()} tokens, $${cost.toFixed(5)}`);
            }
            yield* Console.log("\nModel Statistics:");
            for (const [model, stats] of Object.entries(history.summary.modelStats)) {
                const commands = Number(stats.commands || 0);
                const tokens = Number(stats.tokens || 0);
                const cost = Number(stats.cost || 0);
                yield* Console.log(`  ${model}: ${commands} commands, ${tokens.toLocaleString()} tokens, $${cost.toFixed(5)}`);
            }
        });
        const reportToJson = (history, filePath) => Effect.gen(function* () {
            const fs = yield* Fs.FileSystem;
            yield* fs.writeFileString(filePath, JSON.stringify(history, null, 2));
            yield* Console.info(`[METRICS] Report saved to ${filePath}`);
        });
        const reportToJsonl = (history, filePath) => Effect.gen(function* () {
            const fs = yield* Fs.FileSystem;
            const jsonl = history.runs.map(run => JSON.stringify(run)).join('\n');
            yield* fs.writeFileString(filePath, jsonl);
            yield* Console.info(`[METRICS] JSONL report saved to ${filePath}`);
        });
        const reportMetrics = (format, outputFile) => Effect.gen(function* () {
            const history = yield* readMetricsFile;
            if (history.runs.length === 0) {
                yield* Console.warn("[METRICS] No metrics data available");
                return;
            }
            switch (format) {
                case "console":
                    yield* reportToConsole(history);
                    break;
                case "json":
                    if (outputFile) {
                        yield* reportToJson(history, outputFile);
                    }
                    break;
                case "jsonl":
                    if (outputFile) {
                        yield* reportToJsonl(history, outputFile);
                    }
                    break;
            }
        });
        return {
            startCommand: (command, runId) => Effect.gen(function* () {
                const now = yield* DateTime.now;
                const cwd = process.cwd();
                const env = {
                    nodeVersion: process.version,
                    platform: process.platform,
                    cwd: cwd
                };
                const history = yield* readMetricsFile;
                const currentMetrics = new MetricsData({
                    command,
                    startTime: now,
                    success: true,
                    runId,
                    environment: env
                });
                const updatedHistory = new MetricsHistory({
                    runs: [...history.runs, currentMetrics],
                    summary: calculateSummary([...history.runs, currentMetrics])
                });
                yield* writeMetricsFile(updatedHistory);
                // Only log metrics when not in JSON format
                if ((process.env.OUTPUT_FORMAT || "text") !== "json") {
                    yield* Console.info(`[METRICS] Started command: ${command}`);
                }
            }),
            endCommand: () => Effect.gen(function* () {
                const history = yield* readMetricsFile;
                if (history.runs.length > 0) {
                    const lastRun = history.runs[history.runs.length - 1];
                    const now = yield* DateTime.now;
                    const startTimeMillis = typeof lastRun.startTime === "string"
                        ? new Date(lastRun.startTime).getTime()
                        : DateTime.toEpochMillis(lastRun.startTime);
                    const duration = DateTime.toEpochMillis(now) - startTimeMillis;
                    const updatedRun = new MetricsData({
                        ...lastRun,
                        endTime: now,
                        duration: duration,
                    });
                    const updatedRuns = [...history.runs];
                    updatedRuns[updatedRuns.length - 1] = updatedRun;
                    const updatedHistory = new MetricsHistory({
                        runs: updatedRuns,
                        summary: calculateSummary(updatedRuns)
                    });
                    yield* writeMetricsFile(updatedHistory);
                }
            }),
            recordLLMUsage: (usage) => Effect.gen(function* () {
                const history = yield* readMetricsFile;
                if (history.runs.length > 0) {
                    const lastRun = history.runs[history.runs.length - 1];
                    const updatedRun = new MetricsData({
                        ...lastRun,
                        llmUsage: usage
                    });
                    const updatedRuns = [...history.runs];
                    updatedRuns[updatedRuns.length - 1] = updatedRun;
                    const updatedHistory = new MetricsHistory({
                        runs: updatedRuns,
                        summary: calculateSummary(updatedRuns)
                    });
                    yield* writeMetricsFile(updatedHistory);
                }
            }),
            recordError: (error) => Effect.gen(function* () {
                const history = yield* readMetricsFile;
                if (history.runs.length > 0) {
                    const lastRun = history.runs[history.runs.length - 1];
                    const updatedRun = new MetricsData({
                        ...lastRun,
                        error: {
                            type: error.constructor.name,
                            message: error.message,
                            stack: error.stack,
                        },
                        success: false,
                        endTime: DateTime.unsafeNow(),
                    });
                    const updatedRuns = [...history.runs];
                    updatedRuns[updatedRuns.length - 1] = updatedRun;
                    const updatedHistory = new MetricsHistory({
                        runs: updatedRuns,
                        summary: calculateSummary(updatedRuns),
                    });
                    yield* writeMetricsFile(updatedHistory);
                }
            }),
            recordResponse: (response) => Effect.gen(function* () {
                const history = yield* readMetricsFile;
                if (history.runs.length > 0) {
                    const lastRun = history.runs[history.runs.length - 1];
                    const updatedRun = new MetricsData({
                        ...lastRun,
                        responseLength: response.length,
                        outputTokens: countTokens(response)
                    });
                    const updatedRuns = [...history.runs];
                    updatedRuns[updatedRuns.length - 1] = updatedRun;
                    const updatedHistory = new MetricsHistory({
                        runs: updatedRuns,
                        summary: calculateSummary(updatedRuns)
                    });
                    yield* writeMetricsFile(updatedHistory);
                }
            }),
            recordModelParameters: (parameters) => Effect.gen(function* () {
                const history = yield* readMetricsFile;
                if (history.runs.length > 0) {
                    const lastRun = history.runs[history.runs.length - 1];
                    const updatedRun = new MetricsData({
                        ...lastRun,
                        modelParameters: parameters,
                    });
                    const updatedRuns = [...history.runs];
                    updatedRuns[updatedRuns.length - 1] = updatedRun;
                    const updatedHistory = new MetricsHistory({
                        runs: updatedRuns,
                        summary: calculateSummary(updatedRuns),
                    });
                    yield* writeMetricsFile(updatedHistory);
                }
            }),
            extractLLMUsage: (response, provider, model) => Effect.gen(function* () {
                // Extract usage data from response metadata
                const usageData = response?.usage || {};
                const inputTokens = usageData.promptTokens || usageData.inputTokens || 0;
                const outputTokens = usageData.completionTokens || usageData.outputTokens || 0;
                const thinkingTokens = usageData.reasoningTokens || usageData.thinkingTokens || 0;
                const totalTokens = usageData.totalTokens || (inputTokens + outputTokens + thinkingTokens);
                // Calculate costs
                const estimatedCost = estimateCost(provider, model, totalTokens);
                const inputCost = estimateCost(provider, model, inputTokens) * 0.5;
                const outputCost = estimateCost(provider, model, outputTokens) * 0.8;
                const totalCost = inputCost + outputCost;
                return new LLMUsage({
                    provider,
                    model,
                    inputTokens,
                    outputTokens,
                    thinkingTokens,
                    totalTokens,
                    estimatedCost,
                    inputCost,
                    outputCost,
                    totalCost
                });
            }),
            saveCommandMetrics: (outputPath, format = "json") => Effect.gen(function* () {
                const history = yield* readMetricsFile;
                if (history.runs.length > 0) {
                    const lastRun = history.runs[history.runs.length - 1];
                    const fs = yield* Fs.FileSystem;
                    const path = yield* Path.Path;
                    const output = {
                        ...lastRun,
                        timestamp: new Date().toISOString()
                    };
                    const jsonOutput = JSON.stringify(output, null, 2);
                    const finalOutputPath = outputPath ||
                        path.join(process.cwd(), `metrics-${Date.now()}.json`);
                    yield* fs.writeFileString(finalOutputPath, jsonOutput);
                }
            }),
            getMetrics: () => Effect.gen(function* () {
                const history = yield* readMetricsFile;
                return Option.fromNullable(history.runs[history.runs.length - 1] || null);
            }),
            getMetricsHistory: () => readMetricsFile,
            reportMetrics: (format, outputFile) => reportMetrics(format, outputFile),
            saveMetrics: (outputPath) => Effect.gen(function* () {
                const history = yield* readMetricsFile;
                const path = yield* Path.Path;
                const fs = yield* Fs.FileSystem;
                const outputFile = outputPath || path.join(process.cwd(), "metrics.json");
                yield* reportToJson(history, outputFile);
            }),
            clearMetrics: () => Effect.gen(function* () {
                const emptyHistory = { runs: [], summary: createEmptySummary() };
                yield* writeMetricsFile(emptyHistory);
            })
        };
    }),
    dependencies: []
}) {
}
;
// Cost estimation utilities
export const estimateCost = (provider, model, totalTokens) => {
    // Simplified cost estimation based on provider/model
    const costPerToken = {
        openai: {
            "gpt-4": 0.00003,
            "gpt-3.5-turbo": 0.000002,
            "gpt-4o": 0.000005,
            "gpt-4o-mini": 0.00000015
        },
        anthropic: {
            "claude-3-5-sonnet": 0.000003,
            "claude-3-5-haiku": 0.0000008
        },
        google: {
            "gemini-2.5-flash": 0.00000015,
            "gemini-2.0-flash": 0.00000015
        }
    };
    const providerCosts = costPerToken[provider.toLowerCase()] || {};
    return providerCosts[model.toLowerCase()] || 0.000001 * totalTokens;
};
// Token counting utilities
export const countTokens = (text) => {
    // Very rough token estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
};
