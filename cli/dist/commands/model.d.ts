import { Command } from "@effect/cli";
import { Option as EffectOption } from "effect";
export declare const modelCommand: Command.Command<"model", never, never, {
    readonly subcommand: EffectOption.Option<{
        readonly provider: EffectOption.Option<"openai" | "anthropic" | "google">;
    } | {
        readonly provider: string;
        readonly model: string;
    }>;
}>;
