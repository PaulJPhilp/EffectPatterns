import { Command, Options } from "@effect/cli";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - cli-table3 has no official types
import Table from "cli-table3";
import { Console, Effect, Option } from "effect";
import { MetricsService } from "../../services/metrics-service/service.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { getGlobalCompact, getGlobalJson, printJson, printText } from "../_shared.js";

export const metricsLast = Command.make(
  "last",
  {
    json: Options.boolean("json").pipe(Options.optional),
    output: Options.text("output").pipe(Options.optional, Options.withAlias("o")),
  },
  (opts: any) =>
    Effect.gen(function* () {
      const json = opts.json as Option.Option<boolean> | undefined;
      const output = opts.output as Option.Option<string> | undefined;
      const metrics = yield* MetricsService;
      const outputFile = output && output._tag === "Some" ? output.value : undefined;
      const asJson = ((json && json._tag === "Some")
        ? json.value
        : getGlobalJson()) || Boolean(outputFile);
      const last = yield* metrics.getMetrics();
      if (last._tag === "None") {
        if (asJson) {
          yield* printJson(
            { last: null },
            getGlobalCompact(),
            outputFile ? { outputFile } : undefined
          );
        } else {
          yield* printText(
            "[METRICS] No metrics data available",
            outputFile ? { outputFile } : undefined
          );
        }
        return;
      }

      const run = last.value;
      if (asJson) {
        yield* printJson(
          { last: run },
          getGlobalCompact(),
          outputFile ? { outputFile } : undefined
        );
        return;
      }

      const t = new Table({ head: ["Field", "Value"] });
      t.push(
        ["Command", String(run.command)],
        ["Success", String(!!run.success)],
        ["Start", String(run.startTime)],
        ["End", String(run.endTime ?? "-")],
        ["Duration", `${run.duration ?? 0}ms`]
      );
      if (run.llmUsage) {
        t.push(["Provider", String(run.llmUsage.provider)]);
        t.push(["Model", String(run.llmUsage.model)]);
        t.push(["Input Tokens", String(run.llmUsage.inputTokens)]);
        t.push(["Output Tokens", String(run.llmUsage.outputTokens)]);
        t.push(["Thinking Tokens", String(run.llmUsage.thinkingTokens || 0)]);
        t.push(["Total Tokens", String(run.llmUsage.totalTokens)]);
        t.push(["Estimated Cost", `$${run.llmUsage.estimatedCost.toFixed(5)}`]);
        t.push(["Total Cost", `$${run.llmUsage.totalCost.toFixed(5)}`]);
      }
      if (run.responseLength) {
        t.push(["Response Length", String(run.responseLength)]);
      }
      yield* printText(t.toString(), outputFile ? { outputFile } : undefined);
    })
);
