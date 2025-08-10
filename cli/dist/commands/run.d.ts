import { Command } from "@effect/cli";
import { FileSystem, Path } from "@effect/platform";
import { Option } from "effect";
import { RunService } from "../services/run-service/service.js";
export declare const runCommand: Command.Command<"run", FileSystem.FileSystem | Path.Path | RunService, import("@effect/platform/Error").PlatformError | import("../services/run-service/errors.js").NoActiveRunError, {
    readonly subcommand: Option.Option<{
        readonly prefix: Option.Option<string>;
        readonly quiet: Option.Option<boolean>;
    } | {} | {} | {}>;
}>;
export declare const runUse: Command.Command<"use", FileSystem.FileSystem | Path.Path | RunService, import("@effect/platform/Error").PlatformError, {
    readonly name: string;
}>;
export declare const runDelete: Command.Command<"delete", FileSystem.FileSystem | Path.Path | RunService, import("@effect/platform/Error").PlatformError, {
    readonly name: string;
    readonly force: Option.Option<boolean>;
    readonly quiet: Option.Option<boolean>;
}>;
export declare const run: Command.Command<"run", FileSystem.FileSystem | Path.Path | RunService, import("@effect/platform/Error").PlatformError | import("../services/run-service/errors.js").NoActiveRunError, {
    readonly subcommand: Option.Option<{
        readonly prefix: Option.Option<string>;
        readonly quiet: Option.Option<boolean>;
    } | {} | {} | {} | {
        readonly name: string;
    } | {
        readonly name: string;
        readonly force: Option.Option<boolean>;
        readonly quiet: Option.Option<boolean>;
    }>;
}>;
