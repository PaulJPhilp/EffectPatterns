import { BadArgument, SystemError } from "@effect/platform/Error";
import { Effect } from "effect";
import { OutputOptions } from "./types.js";
import { OutputHandlerError } from "./errors.js";
export interface OutputHandlerServiceApi {
    readonly outputText: (content: string, options: OutputOptions) => Effect.Effect<void, OutputHandlerError | BadArgument | SystemError>;
    readonly outputJson: (data: unknown, options: OutputOptions) => Effect.Effect<void, OutputHandlerError | BadArgument | SystemError>;
}
