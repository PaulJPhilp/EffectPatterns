import { Command } from "@effect/cli";
export declare const dryRun: Command.Command<"dry-run", never, Error, {
    readonly provider: "openai" | "anthropic" | "google";
    readonly model: string;
    readonly prompt: import("effect/Option").Option<string>;
    readonly file: import("effect/Option").Option<string>;
    readonly output: import("effect/Option").Option<string>;
    readonly quiet: import("effect/Option").Option<boolean>;
    readonly force: import("effect/Option").Option<boolean>;
}>;
