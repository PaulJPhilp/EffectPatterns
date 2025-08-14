import { Args, Command, Options } from "@effect/cli";
import { Effect, Option } from "effect";
import { ConfigService } from "../../services/config-service/service.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { getGlobalCompact, getGlobalJson, getGlobalOutputOptions, printJson, printText } from "../_shared.js";
export const configGet = Command.make("get", {
    key: Args.text({ name: "key" }),
    output: Options.text("output").pipe(Options.optional, Options.withAlias("o")),
}, (opts) => Effect.gen(function* () {
    const key = opts.key;
    const jsonOpt = opts.json;
    const outOpt = opts.output;
    const globalOut = getGlobalOutputOptions()?.outputFile;
    const outputFile = outOpt && outOpt._tag === "Some" ? outOpt.value : globalOut;
    const asJson = ((jsonOpt && jsonOpt._tag === "Some")
        ? jsonOpt.value
        : getGlobalJson()) || Boolean(outputFile);
    const config = yield* ConfigService;
    const value = yield* config.get(key);
    if (asJson) {
        yield* printJson({ value: Option.getOrElse(value, () => null) }, getGlobalCompact(), outputFile ? { outputFile } : undefined);
    }
    else {
        const output = Option.match(value, {
            onNone: () => `Key '${key}' not found`,
            onSome: (v) => v,
        });
        yield* printText(output, outputFile ? { outputFile } : undefined);
    }
}));
//# sourceMappingURL=get.js.map