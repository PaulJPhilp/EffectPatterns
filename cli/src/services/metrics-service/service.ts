import { Effect, DateTime, Console, Option, Data, Layer } from "effect";
import * as Fs from "@effect/platform/FileSystem";
import * as Path from "@effect/platform/Path";


// Enhanced metrics data structures
export class LLMUsage extends Data.Class<{
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
}> {}

export class MetricsData extends Data.Class<{
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
}> {}

export class MetricsSummary extends Data.Class<{
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  totalTokens: number;
  totalCost: number;
  averageDuration: number;
  providerStats: Record<string, { commands: number; tokens: number; cost: number }>;
  modelStats: Record<string, { commands: number; tokens: number; cost: number }>;
}> {}

export class MetricsHistory extends Data.Class<{
  runs: MetricsData[];
  summary: MetricsSummary;
}> {}

// Error class
export class MetricsError extends Data.Error<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

// Service interface
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

// Service implementation using Effect.Service pattern
export class MetricsService extends Effect.Service<MetricsService>()(
  "MetricsService",
  {
    effect: Effect.gen(function* () {
      const createEmptySummary = (): MetricsSummary => new MetricsSummary({
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

        return yield* fs.readFileString(metricsFile).pipe(
          Effect.mapError((cause) => new MetricsError({ message: "Failed to read metrics file", cause })),
          Effect.flatMap((content) =>
            Effect.try({
              try: () => JSON.parse(content) as MetricsHistory,
              catch: (cause) => new MetricsError({ message: "Failed to parse metrics file", cause }),
            })
          ),
          Effect.catchAll(() => Effect.succeed(new MetricsHistory({ runs: [], summary: createEmptySummary() })))
        );
      });

      const writeMetricsFile = (history: MetricsHistory, outputPath?: string) =>
        Effect.gen(function* () {
          const fs = yield* Fs.FileSystem;
          const metricsFile = outputPath || (yield* getMetricsFilePath);

          const path = yield* Path.Path;
          const dir = path.dirname(metricsFile);
          const dirExists = yield* fs.exists(dir);
          if (!dirExists) {
            yield* fs.makeDirectory(dir, { recursive: true });
          }

          yield* fs.writeFileString(metricsFile, JSON.stringify(history, null, 2)).pipe(
            Effect.mapError((cause) => new MetricsError({ message: "Failed to write metrics file", cause }))
          );
        });

      const calculateSummary = (runs: MetricsData[]): MetricsSummary => {
        const totalCommands = runs.length;
        const successfulCommands = runs.filter(r => r.success).length;
        const failedCommands = totalCommands - successfulCommands;
        const totalTokens = runs.reduce((sum, r) => sum + (r.llmUsage?.totalTokens || 0), 0);
        const totalCost = runs.reduce((sum, r) => sum + (r.llmUsage?.totalCost || 0), 0);
        const totalDuration = runs.reduce((sum, r) => sum + (r.duration || 0), 0);
        const averageDuration = totalCommands > 0 ? totalDuration / totalCommands : 0;

        const providerStats: Record<string, { commands: number; tokens: number; cost: number }> = {};
        const modelStats: Record<string, { commands: number; tokens: number; cost: number }> = {};

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

      const reportToConsole = (history: MetricsHistory) =>
        Effect.gen(function* () {
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

      const reportToJson = (history: MetricsHistory, filePath: string) =>
        Effect.gen(function* () {
          const fs = yield* Fs.FileSystem;
          yield* fs.writeFileString(filePath, JSON.stringify(history, null, 2));
          yield* Console.info(`[METRICS] Report saved to ${filePath}`);
        });

      const reportToJsonl = (history: MetricsHistory, filePath: string) =>
        Effect.gen(function* () {
          const fs = yield* Fs.FileSystem;
          const jsonl = history.runs.map(run => JSON.stringify(run)).join('\n');
          yield* fs.writeFileString(filePath, jsonl);
          yield* Console.info(`[METRICS] JSONL report saved to ${filePath}`);
        });

      const reportMetrics = (format: "console" | "json" | "jsonl", outputFile?: string) =>
        Effect.gen(function* () {
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
        startCommand: (command: string, runId?: string) =>
          Effect.gen(function* () {
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
            yield* Console.info(`[METRICS] Started command: ${command}`);
          }),

        endCommand: () =>
          Effect.gen(function* () {
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

        recordLLMUsage: (usage: LLMUsage) =>
          Effect.gen(function* () {
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

        recordError: (error: Error) =>
          Effect.gen(function* () {
            const history = yield* readMetricsFile;
            if (history.runs.length > 0) {
              const lastRun = history.runs[history.runs.length - 1];
              const updatedRun = new MetricsData({
                ...lastRun,
                success: false,
                error: {
                  type: error.constructor.name,
                  message: error.message,
                  stack: error.stack
                }
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

        recordPrompt: (prompt: string) =>
          Effect.gen(function* () {
            const history = yield* readMetricsFile;
            if (history.runs.length > 0) {
              const lastRun = history.runs[history.runs.length - 1];
              const updatedRun = new MetricsData({
                ...lastRun,
                promptLength: prompt.length,
                inputTokens: countTokens(prompt)
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

        recordResponse: (response: string) =>
          Effect.gen(function* () {
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

        recordModelParameters: (parameters: {
          temperature?: number;
          maxTokens?: number;
          topP?: number;
        }) =>
          Effect.gen(function* () {
            const history = yield* readMetricsFile;
            if (history.runs.length > 0) {
              const lastRun = history.runs[history.runs.length - 1];
              const updatedRun = new MetricsData({
                ...lastRun,
                modelParameters: parameters
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

        getMetrics: () =>
          Effect.gen(function* () {
            const history = yield* readMetricsFile;
            return Option.fromNullable(history.runs[history.runs.length - 1] || null);
          }),

        getMetricsHistory: () => readMetricsFile,

        reportMetrics: (format: "console" | "json" | "jsonl", outputFile?: string) =>
          reportMetrics(format, outputFile),

        saveMetrics: (outputPath?: string) =>
          Effect.gen(function* () {
            const history = yield* readMetricsFile;
            const path = yield* Path.Path;
            const fs = yield* Fs.FileSystem;
            const outputFile = outputPath || path.join(process.cwd(), "metrics.json");
            yield* reportToJson(history, outputFile);
          }),

        clearMetrics: () =>
          Effect.gen(function* () {
            const emptyHistory = { runs: [], summary: createEmptySummary() };
            yield* writeMetricsFile(emptyHistory);
          })
      };
    }),
    dependencies: []
  }
) {};


// Cost estimation utilities
export const estimateCost = (provider: string, model: string, totalTokens: number): number => {
  // Simplified cost estimation based on provider/model
  const costPerToken: Record<string, Record<string, number>> = {
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
export const countTokens = (text: string): number => {
  // Very rough token estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
};
