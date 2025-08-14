import { Command } from "@effect/cli";
export declare const modelCommand: Command.Command<"model", import("../../services/config-service/service.js").ConfigService, import("../../services/config-service/errors.js").ConfigError, {
    readonly subcommand: import("effect/Option").Option<{
        readonly provider: import("effect/Option").Option<string>;
    } | {
        readonly provider: string;
        readonly model: string;
    }>;
}>;
//# sourceMappingURL=index.d.ts.map