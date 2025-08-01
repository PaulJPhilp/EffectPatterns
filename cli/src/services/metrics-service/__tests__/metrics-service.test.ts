import { describe, it, expect, vi, beforeEach } from "vitest";
import { Effect, Layer, Option } from "effect";
import { MetricsService } from "../service.js";
import * as Fs from "@effect/platform/FileSystem";
import * as Path from "@effect/platform/Path";
import { Console } from "effect";
import { NodeContext } from "@effect/platform-node";

// Cost estimation utilities
const estimateCost = (provider: string, model: string, totalTokens: number): number => {
  const costPerThousand = {
    openai: {
      "gpt-4": 0.03,
      "gpt-4-turbo": 0.01,
      "gpt-3.5-turbo": 0.002,
    },
    anthropic: {
      "claude-3-5-sonnet": 0.003,
      "claude-3-5-haiku": 0.0008,
    },
  };

  const providerCosts = costPerThousand[provider as keyof typeof costPerThousand];
  const costPerToken = providerCosts ? providerCosts[model as keyof typeof providerCosts] || 0.001 : 0.001;
  return (totalTokens / 1000) * costPerToken;
};

const countTokens = (text: string): number => {
  if (!text.trim()) return 0;
  return Math.ceil(text.split(/\s+/).length * 1.3);
};

describe("MetricsService", () => {
  beforeEach(async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const metrics = yield* MetricsService;
        yield* metrics.clearMetrics();
      }).pipe(Effect.provide(Layer.merge(MetricsService.Default, NodeContext.layer)))
    );
  });
  it("should track command lifecycle", async () => {
    const optionResult = await Effect.runPromise(
      Effect.gen(function* () {
        const metrics = yield* MetricsService;
        yield* metrics.startCommand("test-command");
        yield* metrics.endCommand();
        return yield* metrics.getMetrics();
      }).pipe(Effect.provide(Layer.merge(MetricsService.Default, NodeContext.layer)))
    );

    expect(Option.isSome(optionResult)).toBe(true);
    
    // Safely unwrap the Option
    const result = Option.getOrNull(optionResult);
    expect(result).not.toBeNull();
    console.log("Metrics result:", result);
    expect(result?.command).toBe("test-command");
    expect(result?.success).toBe(true);
    expect(result?.duration).toBeGreaterThanOrEqual(0);
  });

  it("should record LLM usage", async () => {
    const mockUsage = {
      provider: "openai",
      model: "gpt-4",
      inputTokens: 100,
      outputTokens: 50,
      thinkingTokens: 0,
      totalTokens: 150,
      estimatedCost: 0.00225
    };

    const optionResult = await Effect.runPromise(
      Effect.gen(function* () {
        const metrics = yield* MetricsService;
        yield* metrics.startCommand("test-command");
        // Add missing properties to mockUsage to match LLMUsage interface
        const completeUsage = {
          ...mockUsage,
          inputCost: 0.001,
          outputCost: 0.001,
          totalCost: 0.002
        };
        yield* metrics.recordLLMUsage(completeUsage);
        yield* metrics.endCommand();
        return yield* metrics.getMetrics();
      }).pipe(Effect.provide(Layer.merge(MetricsService.Default, NodeContext.layer)))
    );

    const result = Option.getOrNull(optionResult);
    expect(result).not.toBeNull();
    expect(result?.llmUsage).toEqual(expect.objectContaining({
      provider: mockUsage.provider,
      model: mockUsage.model,
      totalTokens: mockUsage.totalTokens
    }));
  });

  it("should record errors", async () => {
    const mockError = new Error("Test error");

    const optionResult = await Effect.runPromise(
      Effect.gen(function* () {
        const metrics = yield* MetricsService;
        yield* metrics.startCommand("test-command");
        yield* metrics.recordError(new Error("Test error"));
        yield* metrics.endCommand();
        return yield* metrics.getMetrics();
      }).pipe(Effect.provide(Layer.merge(MetricsService.Default, NodeContext.layer)))
    );

    const result = Option.getOrNull(optionResult);
    expect(result).not.toBeNull();
    expect(result?.success).toBe(false);
    expect(result?.error?.message).toBe("Test error");
  });

  it("should handle console reporting", async () => {
    const consoleSpy = vi.spyOn(console, "log");

    await Effect.runPromise(
      Effect.gen(function* () {
        const metrics = yield* MetricsService;
        yield* metrics.startCommand("test-command");
        yield* metrics.endCommand();
        yield* metrics.reportMetrics("console");
      }).pipe(Effect.provide(Layer.merge(MetricsService.Default, NodeContext.layer)))
    );

    expect(consoleSpy).toHaveBeenCalledWith("=== METRICS REPORT ===");
    consoleSpy.mockRestore();
  });

  it("should handle cost estimation correctly", () => {
    expect(estimateCost("openai", "gpt-4", 1000)).toBe(0.03);
    expect(estimateCost("anthropic", "claude-3-5-sonnet", 1000)).toBe(0.003);
    expect(countTokens("Hello world")).toBe(3);
  });

  it("should handle token counting correctly", () => {
    const testCases = [
      { text: "Hello world", expected: 3 },
      { text: "This is a longer test string with more characters", expected: 12 },
      { text: "", expected: 0 }
    ];

    testCases.forEach(({ text, expected }) => {
      const tokens = countTokens(text);
      expect(tokens).toBe(expected);
    });
  });
});
