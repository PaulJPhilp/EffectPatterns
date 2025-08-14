import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { getGlobalCompact, getGlobalJson, printJson, printText } from "../_shared.js";
import { MetricsService } from "../../services/metrics-service/service.js";
export const metricsClear = Command.make("clear", { output: Options.text("output").pipe(Options.optional, Options.withAlias("o")) }, (opts) => Effect.gen(function* () {
    const output = opts.output;
    const json = opts.json;
    const metrics = yield* MetricsService;
    yield* metrics.clearMetrics();
    const outputFile = output && output._tag === "Some" ? output.value : undefined;
    const asJson = ((json && json._tag === "Some") ? json.value : getGlobalJson())
        || Boolean(outputFile);
    if (asJson) {
        yield* printJson({ cleared: true }, getGlobalCompact(), outputFile ? { outputFile } : undefined);
    }
    else {
        yield* printText("Cleared metrics history", outputFile ? { outputFile } : undefined);
    }
}));
//# sourceMappingURL=clear.js.map