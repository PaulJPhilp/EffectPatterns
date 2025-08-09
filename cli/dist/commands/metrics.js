import { Command, Options } from "@effect/cli";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - cli-table3 has no official types
import Table from "cli-table3";
import { Console, Effect, Option } from "effect";
import { MetricsService } from "../services/metrics-service/service.js";
const formatOpt = Options.optional(Options.choice("format", ["console", "json", "jsonl"]));
const outputOpt = Options.optional(Options.text("output").pipe(Options.withAlias("o")));
function renderSummaryTable(args) {
    const t = new Table({ head: ["Metric", "Value"] });
    t.push(["Total Commands", String(args.totalCommands)], ["Successful", String(args.successfulCommands)], ["Failed", String(args.failedCommands)], ["Total Tokens", args.totalTokens.toLocaleString()], ["Total Cost", `$${args.totalCost.toFixed(5)}`], ["Average Duration", `${Math.round(args.averageDuration)}ms`]);
    return t.toString();
}
function renderKeyedStatsTable(title, stats) {
    const t = new Table({ head: [title, "Commands", "Tokens", "Cost"] });
    for (const [key, s] of Object.entries(stats)) {
        t.push([
            key,
            String(Number(s.commands || 0)),
            Number(s.tokens || 0).toLocaleString(),
            `$${Number(s.cost || 0).toFixed(5)}`,
        ]);
    }
    return t.toString();
}
const metricsReport = Command.make("report", { format: formatOpt, output: outputOpt }, ({ format, output }) => Effect.gen(function* () {
    const metrics = yield* MetricsService;
    const resolvedFormat = Option.getOrElse(format, () => "console");
    if (resolvedFormat === "console") {
        const history = yield* metrics.getMetricsHistory();
        if (history.runs.length === 0) {
            yield* Console.warn("[METRICS] No metrics data available");
            return;
        }
        const summaryStr = renderSummaryTable(history.summary);
        const providerStr = renderKeyedStatsTable("Provider", history.summary.providerStats);
        const modelStr = renderKeyedStatsTable("Model", history.summary.modelStats);
        yield* Console.log(summaryStr);
        yield* Console.log(providerStr);
        yield* Console.log(modelStr);
        return;
    }
    if (resolvedFormat === "json" || resolvedFormat === "jsonl") {
        if (Option.isSome(output)) {
            yield* metrics.reportMetrics(resolvedFormat, output.value);
            return;
        }
        const history = yield* metrics.getMetricsHistory();
        if (resolvedFormat === "json") {
            yield* Console.log(JSON.stringify(history, null, 2));
        }
        else {
            const jsonl = history.runs.map((r) => JSON.stringify(r)).join("\n");
            yield* Console.log(jsonl);
        }
    }
}));
const metricsLast = Command.make("last", {}, () => Effect.gen(function* () {
    const metrics = yield* MetricsService;
    const last = yield* metrics.getMetrics();
    if (last._tag === "None") {
        yield* Console.warn("[METRICS] No metrics data available");
        return;
    }
    const run = last.value;
    const t = new Table({ head: ["Field", "Value"] });
    t.push(["Command", String(run.command)], ["Success", String(!!run.success)], ["Start", String(run.startTime)], ["End", String(run.endTime ?? "-")], ["Duration", `${run.duration ?? 0}ms`]);
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
    yield* Console.log(t.toString());
}));
const metricsClear = Command.make("clear", {}, () => Effect.gen(function* () {
    const metrics = yield* MetricsService;
    yield* metrics.clearMetrics();
    yield* Console.log("Cleared metrics history");
}));
export const metricsCommand = Command.make("metrics").pipe(Command.withSubcommands([metricsReport, metricsLast, metricsClear]));
