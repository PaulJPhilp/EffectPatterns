import { Effect, Option } from "effect";
import { Command } from "@effect/cli";
import { Options } from "@effect/cli";
import { OutputHandlerService } from "../services/output-handler/service.js";
import type { OutputOptions } from "../services/output-handler/types.js";
export declare const withErrorLogging: (prefix: string) => <A>(eff: Effect.Effect<A, any, any>) => Effect.Effect<A, any, any>;
export declare const makeCommand: (name: string, options: any, handler: (opts: any) => Effect.Effect<any, any, any>, cfg: {
    description: string;
    errorPrefix: string;
}) => Command.Command<string, any, any, {
    readonly [x: string]: unknown;
}>;
export declare const setGlobalOutputOptions: (opts: OutputOptions | undefined) => void;
export declare const getGlobalOutputOptions: () => OutputOptions | undefined;
export declare const printText: (message: string, options?: OutputOptions) => Effect.Effect<void, import("@effect/platform/Error").BadArgument | import("@effect/platform/Error").SystemError | import("../services/output-handler/errors.js").OutputHandlerError, OutputHandlerService>;
export declare const printJson: (value: unknown, compact: boolean, options?: OutputOptions) => Effect.Effect<void, import("@effect/platform/Error").BadArgument | import("@effect/platform/Error").SystemError | import("../services/output-handler/errors.js").OutputHandlerError, OutputHandlerService>;
export declare const optQuiet: (desc?: string) => Options.Options<Option.Option<boolean>>;
export declare const optForce: (desc?: string) => Options.Options<Option.Option<boolean>>;
export declare const optOutput: (desc?: string) => Options.Options<Option.Option<string>>;
export declare const optName: (desc?: string) => Options.Options<string>;
export declare const setGlobalJson: (value: boolean | undefined) => void;
export declare const getGlobalJson: () => boolean;
export declare const setGlobalCompact: (value: boolean | undefined) => void;
export declare const getGlobalCompact: () => boolean;
export declare const makeCommandGroup: (name: string, options: any, children: readonly any[], cfg: {
    description: string;
    onInit?: (opts: any) => void;
}) => Command.Command<string, unknown, unknown, {
    readonly [x: string]: unknown;
    readonly subcommand: Option.Option<unknown>;
}>;
//# sourceMappingURL=_shared.d.ts.map