import { Command } from "@effect/cli";
import { Option } from "effect";
export declare const traceCommand: Command.Command<"trace", never, never, {
    readonly command: Option.Option<string>;
    readonly span: Option.Option<string>;
    readonly json: Option.Option<boolean>;
    readonly verbose: Option.Option<boolean>;
    readonly output: Option.Option<string>;
    readonly force: Option.Option<boolean>;
    readonly quiet: Option.Option<boolean>;
    readonly noColor: Option.Option<boolean>;
}>;
