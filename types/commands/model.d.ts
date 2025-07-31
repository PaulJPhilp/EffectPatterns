import { Command } from "@effect/cli";
import { Option as EffectOption } from "effect";
export declare const modelList: Command.Command<"list", unknown, unknown, {
    readonly provider: EffectOption.Option<"anthropic" | "openai" | "google">;
}>;
export declare const modelInfo: Command.Command<"info", unknown, unknown, {
    readonly provider: any;
    readonly model: string;
}>;
