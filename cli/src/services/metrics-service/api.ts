import { Effect, Option } from "effect";
import { LLMUsage, MetricsData, MetricsHistory } from "./types.js";

// Service interface
export interface MetricsServiceApi {
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
  extractLLMUsage: (response: any, provider: string, model: string) => Effect.Effect<LLMUsage>;
  saveCommandMetrics: (outputPath?: string, format?: "json" | "jsonl") => Effect.Effect<void>;
  reportMetrics: (format: "console" | "json" | "jsonl", outputFile?: string) => Effect.Effect<void>;
  getMetrics: () => Effect.Effect<Option.Option<MetricsData>>;
  getMetricsHistory: () => Effect.Effect<MetricsHistory>;
  saveMetrics: (outputPath?: string) => Effect.Effect<void>;
  clearMetrics: () => Effect.Effect<void>;
}