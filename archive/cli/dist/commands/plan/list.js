import { Command, Options } from "@effect/cli";
import { Effect, Option } from "effect";
import { ConfigService } from "../../services/config-service/service.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { getGlobalCompact, getGlobalJson, getGlobalOutputOptions, printJson, printText } from "../_shared.js";
export const planList = Command.make("list", { output: Options.text("output").pipe(Options.optional, Options.withAlias("o")) }, (opts) => Effect.gen(function* () {
    const jsonOpt = opts.json;
    const outOpt = opts.output;
    const globalOut = getGlobalOutputOptions()?.outputFile;
    const outputFile = outOpt && outOpt._tag === "Some" ? outOpt.value : globalOut;
    const asJson = ((jsonOpt && jsonOpt._tag === "Some")
        ? jsonOpt.value
        : getGlobalJson()) || Boolean(outputFile);
    const config = yield* ConfigService;
    const retries = yield* config.get("planRetries");
    const retryMs = yield* config.get("planRetryMs");
    const fallbacks = yield* config.get("planFallbacks");
    const retriesDisplay = Option.match(retries, {
        onNone: () => "(default) 1",
        onSome: (v) => String(v),
    });
    const retryMsDisplay = Option.match(retryMs, {
        onNone: () => "(default) 1000",
        onSome: (v) => String(v),
    });
    const fallbackDisplay = yield* Option.match(fallbacks, {
        onNone: () => Effect.succeed([
            {
                provider: "openai",
                model: "gpt-4o-mini",
                attempts: 1,
                retryMs: 1500,
            },
            {
                provider: "anthropic",
                model: "claude-3-5-haiku",
                attempts: 1,
                retryMs: 1500,
            },
        ]),
        onSome: (v) => Effect.try({
            try: () => JSON.parse(String(v)),
            catch: () => [
                { provider: "openai", model: "gpt-4o-mini" },
                { provider: "anthropic", model: "claude-3-5-haiku" },
            ],
        }).pipe(Effect.map((arr) => arr.map((x) => ({ ...x, attempts: 1, retryMs: 1500 })))),
    });
    const primary = {
        retries: retriesDisplay,
        attempts: Option.match(retries, {
            onNone: () => 2,
            onSome: (v) => {
                const n = Number.parseInt(String(v), 10);
                return (Number.isFinite(n) && n >= 0 ? n : 1) + 1;
            },
        }),
        retryMs: retryMsDisplay,
    };
    const planObj = { primary, fallbacks: fallbackDisplay };
    if (asJson) {
        yield* printJson({ plan: planObj }, getGlobalCompact(), outputFile ? { outputFile } : undefined);
    }
    else {
        const text = JSON.stringify(planObj, null, 2);
        yield* printText(text, outputFile ? { outputFile } : undefined);
    }
}));
//# sourceMappingURL=list.js.map