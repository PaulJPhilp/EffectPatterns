import { BadArgument, SystemError } from "@effect/platform/Error";
import { FileSystem } from "@effect/platform";
import { Effect } from "effect";
import { OutputHandlerError } from "./errors.js";
import { OutputOptions } from "./types.js";
declare const OutputHandlerService_base: Effect.Service.Class<OutputHandlerService, "OutputHandlerService", {
    readonly effect: Effect.Effect<{
        outputText: (content: string, options: OutputOptions) => Effect.Effect<void, OutputHandlerError | BadArgument | SystemError>;
        outputJson: (data: unknown, options: OutputOptions) => Effect.Effect<void, OutputHandlerError | BadArgument | SystemError>;
    }, never, FileSystem.FileSystem>;
    readonly dependencies: readonly [import("effect/Layer").Layer<FileSystem.FileSystem, never, never>];
}>;
export declare class OutputHandlerService extends OutputHandlerService_base {
}
export {};
//# sourceMappingURL=service.d.ts.map