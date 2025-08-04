import { Command } from "@effect/cli";
export declare const traceCommand: Command.Command<"trace", never, never, {
    readonly command: import("effect/Option").Option<string>;
    readonly span: import("effect/Option").Option<string>;
    readonly json: import("effect/Option").Option<boolean>;
    readonly verbose: import("effect/Option").Option<boolean>;
    readonly output: import("effect/Option").Option<string>;
    readonly force: import("effect/Option").Option<boolean>;
    readonly quiet: import("effect/Option").Option<boolean>;
}>;
