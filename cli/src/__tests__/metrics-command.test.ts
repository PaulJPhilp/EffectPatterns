import { Command } from "@effect/cli";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { metricsCommand } from "../commands/metrics.js";
import { TestRuntime, runTestEffect } from "../runtime/testing-runtime.js";
import { MetricsService } from "../services/metrics-service/service.js";

function runCli(command: typeof metricsCommand, args: readonly string[]) {
  const runner = Command.run(command, { name: "test", version: "0.0.0" });
  return TestRuntime.runPromise(runner(["node", "test", ...args]));
}

describe("metrics command", () => {
  it("report prints console tables when data exists", async () => {
    // Seed a run directly via MetricsService (avoid real AI calls)
    await runTestEffect(
      Effect.gen(function* () {
        const metrics = yield* MetricsService;
        yield* metrics.startCommand("generate");
        yield* metrics.recordLLMUsage({
          provider: "google",
          model: "gemini-2.5-flash",
          inputTokens: 10,
          outputTokens: 20,
          thinkingTokens: 0,
          totalTokens: 30,
          estimatedCost: 0,
          inputCost: 0,
          outputCost: 0,
          totalCost: 0,
        });
        yield* metrics.endCommand();
      })
    );

    await runCli(metricsCommand, ["metrics", "report", "--format", "console"]);
  });

  it("last shows the latest run in a table", async () => {
    await runCli(metricsCommand, ["metrics", "last"]);
  });

  it("clear removes metrics history", async () => {
    await runCli(metricsCommand, ["metrics", "clear"]);

    // Verify cleared
    const last = await runTestEffect(
      Effect.gen(function* () {
        const metrics = yield* MetricsService;
        return yield* metrics.getMetrics();
      })
    );
    expect(last._tag).toBe("None");
  });
});
