import { Command, Options } from "@effect/cli";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - cli-table3 has no official types
import Table from "cli-table3";
import { Console, Effect, Option } from "effect";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { getGlobalCompact, getGlobalJson, printJson, printText } from "../_shared.js";
import { MetricsService } from "../../services/metrics-service/service.js";
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
export const metricsReport = Command.make("report", { format: formatOpt, output: outputOpt }, (opts) => Effect.gen(function* () {
    const format = opts.format;
    const output = opts.output;
    const groupJson = opts.json;
    const metrics = yield* MetricsService;
    const outputFileOpt = opts.output;
    const preferJson = groupJson && groupJson._tag === "Some"
        ? groupJson.value
        : getGlobalJson();
    const resolvedFormat = Option.match(format, {
        onNone: () => (outputFileOpt && outputFileOpt._tag === "Some") || preferJson
            ? "json"
            : "console",
        onSome: (fmt) => fmt,
    });
    if (resolvedFormat === "console") {
        const history = yield* metrics.getMetricsHistory();
        if (history.runs.length === 0) {
            yield* Console.warn("[METRICS] No metrics data available");
            return;
        }
        const summaryStr = renderSummaryTable(history.summary);
        const providerStr = renderKeyedStatsTable("Provider", history.summary.providerStats);
        const modelStr = renderKeyedStatsTable("Model", history.summary.modelStats);
        yield* printText(summaryStr);
        yield* printText(providerStr);
        yield* printText(modelStr);
        return;
    }
    if (resolvedFormat === "json" || resolvedFormat === "jsonl") {
        const history = yield* metrics.getMetricsHistory();
        const outputFile = output && output._tag === "Some" ? output.value : undefined;
        if (resolvedFormat === "json") {
            yield* printJson(history, getGlobalCompact(), outputFile ? { outputFile } : undefined);
        }
        else {
            const jsonl = history.runs
                .map((r) => JSON.stringify(r))
                .join("\n");
            yield* printText(jsonl, outputFile ? { outputFile } : undefined);
        }
    }
}));
//# sourceMappingURL=report.js.map