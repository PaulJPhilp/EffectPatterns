import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import { ConfigService } from "../../services/config-service/service.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { getGlobalCompact, getGlobalJson, getGlobalOutputOptions, printJson, printText } from "../_shared.js";
export const configList = Command.make("list", { output: Options.text("output").pipe(Options.optional, Options.withAlias("o")) }, (opts) => Effect.gen(function* () {
    const jsonOpt = opts.json;
    const outOpt = opts.output;
    const globalOut = getGlobalOutputOptions()?.outputFile;
    const outputFile = outOpt && outOpt._tag === "Some" ? outOpt.value : globalOut;
    const asJson = ((jsonOpt && jsonOpt._tag === "Some")
        ? jsonOpt.value
        : getGlobalJson()) || Boolean(outputFile);
    const config = yield* ConfigService;
    const allConfig = yield* config.list();
    if (asJson) {
        yield* printJson({ config: allConfig }, getGlobalCompact(), outputFile ? { outputFile } : undefined);
    }
    else {
        yield* printText(JSON.stringify(allConfig, null, 2), outputFile ? { outputFile } : undefined);
    }
}));
//# sourceMappingURL=list.js.map