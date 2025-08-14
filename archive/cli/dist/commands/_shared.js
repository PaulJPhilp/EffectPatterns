import { Console, Effect, Option } from "effect";
import { writeFileSync } from "node:fs";
import { Command } from "@effect/cli";
import { Options } from "@effect/cli";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { OutputHandlerService } from "../services/output-handler/service.js";
// Wraps an effect to log an error with a prefixed message and rethrow.
// Keeps the same error surface; only centralizes the catch/log mechanics.
export const withErrorLogging = (prefix) => (eff) => eff.pipe(Effect.catchAll((error) => Console.error(`${prefix}: ${error?.message ?? String(error)}`).pipe(Effect.andThen(Effect.fail(error)))));
// DRY helper to create commands with description and standardized
// error logging wrapper. Keeps existing error surface intact.
export const makeCommand = (name, options, handler, cfg) => Command.make(name, options, (opts) => handler(opts).pipe(withErrorLogging(cfg.errorPrefix))).pipe(Command.withDescription(cfg.description));
// Centralized output helpers
let GLOBAL_OUTPUT_OPTIONS;
export const setGlobalOutputOptions = (opts) => {
    GLOBAL_OUTPUT_OPTIONS = opts;
};
export const getGlobalOutputOptions = () => GLOBAL_OUTPUT_OPTIONS;
export const printText = (message, options) => Effect.gen(function* () {
    const merged = {
        ...(GLOBAL_OUTPUT_OPTIONS ?? {}),
        ...(options ?? {}),
    };
    try {
        const svc = yield* OutputHandlerService;
        yield* svc.outputText(message, merged);
    }
    catch {
        if (merged.outputFile) {
            // Fallback: write file directly if service unavailable
            writeFileSync(merged.outputFile, message, "utf-8");
        }
        else {
            yield* Effect.log(message);
        }
    }
});
export const printJson = (value, compact, options) => Effect.gen(function* () {
    const json = JSON.stringify(value, null, compact ? undefined : 2);
    const merged = {
        ...(GLOBAL_OUTPUT_OPTIONS ?? {}),
        ...(options ?? {}),
    };
    try {
        const svc = yield* OutputHandlerService;
        yield* svc.outputText(json, merged);
    }
    catch {
        if (merged.outputFile) {
            writeFileSync(merged.outputFile, json, "utf-8");
        }
        else {
            yield* Effect.log(json);
        }
    }
});
// Shared option builders
export const optQuiet = (desc = "Suppress output") => Options.boolean("quiet").pipe(Options.optional, Options.withAlias("q"), Options.withDescription(desc));
export const optForce = (desc = "Force operation") => Options.boolean("force").pipe(Options.optional, Options.withAlias("f"), Options.withDescription(desc));
export const optOutput = (desc = "Write output to file") => Options.text("output").pipe(Options.optional, Options.withAlias("o"), Options.withDescription(desc));
export const optName = (desc = "Name") => Options.text("name").pipe(Options.withDescription(desc));
// Global flag plumbing (simple module-level state)
let GLOBAL_JSON_FLAG;
let GLOBAL_COMPACT_FLAG;
export const setGlobalJson = (value) => {
    GLOBAL_JSON_FLAG = value;
};
export const getGlobalJson = () => GLOBAL_JSON_FLAG === true;
export const setGlobalCompact = (value) => {
    GLOBAL_COMPACT_FLAG = value;
};
export const getGlobalCompact = () => GLOBAL_COMPACT_FLAG === true;
// Helper for command groups: sets shared flags and wires description.
export const makeCommandGroup = (name, options, children, cfg) => Command.make(name, {
    json: Options.boolean("json").pipe(Options.optional),
    compact: Options.boolean("compact").pipe(Options.optional),
    quiet: optQuiet(),
    output: optOutput(),
    force: optForce(),
    ...options,
}, (opts) => Effect.sync(() => {
    // Normalize Option values from CLI into primitives
    const jsonFlag = Option.getOrElse(opts.json, () => false);
    const compactFlag = Option.getOrElse(opts.compact, () => false);
    const quietFlag = Option.getOrElse(opts.quiet, () => false);
    const outputFile = Option.getOrElse(opts.output, () => undefined);
    const forceFlag = Option.getOrElse(opts.force, () => false);
    // Set global flags and output options
    setGlobalJson(jsonFlag);
    setGlobalCompact(compactFlag);
    setGlobalOutputOptions(quietFlag || outputFile || forceFlag
        ? {
            quiet: quietFlag || undefined,
            outputFile,
            force: forceFlag || undefined,
        }
        : undefined);
    cfg.onInit?.(opts);
})).pipe(Command.withSubcommands(children), Command.withDescription(cfg.description));
//# sourceMappingURL=_shared.js.map