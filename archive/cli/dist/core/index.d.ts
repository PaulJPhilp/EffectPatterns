import { Command } from "@effect/cli";
type AnyCommand = Command.Command<any, unknown, unknown, any>;
export interface CliPlugin {
    readonly name: string;
    readonly commands: readonly AnyCommand[];
}
export interface CreateCliOptions {
    readonly commands?: readonly AnyCommand[];
    readonly plugins?: readonly CliPlugin[];
    readonly name?: string;
    readonly version?: string;
}
export declare function createCli(options: CreateCliOptions): Command.Command<string, never, never, {
    readonly configs: import("effect/Option").Option<import("effect/HashMap").HashMap<string, string>>;
    readonly version: boolean;
    readonly help: boolean;
    readonly run: import("effect/Option").Option<string>;
    readonly otel: boolean;
    readonly otelEndpoint: import("effect/Option").Option<string>;
    readonly otelServiceName: import("effect/Option").Option<string>;
}> | Command.Command<string, unknown, unknown, {
    readonly configs: import("effect/Option").Option<import("effect/HashMap").HashMap<string, string>>;
    readonly version: boolean;
    readonly help: boolean;
    readonly run: import("effect/Option").Option<string>;
    readonly otel: boolean;
    readonly otelEndpoint: import("effect/Option").Option<string>;
    readonly otelServiceName: import("effect/Option").Option<string>;
    readonly subcommand: import("effect/Option").Option<any>;
}>;
export declare function runCli(root: AnyCommand, argv?: string[]): Promise<never>;
export { runWithAppropriateRuntime } from "../runtime/runtime-selector.js";
export { authCommand } from "../commands/auth.js";
export { configCommand } from "../commands/config.js";
export { dryRun } from "../commands/dry-run.js";
export { echoCommand } from "../commands/echo.js";
export { effectPatternsGen as genAliasCommand, effectPatternsGenerate as generateCommand, effectPatternsProcessPromptLegacy as processPromptLegacyCommand, } from "../commands/generate.js";
export { health } from "../commands/health.js";
export { effectPatternsList as listCommand } from "../commands/list.js";
export { metricsCommand } from "../commands/metrics.js";
export { planCommand } from "../commands/plan.js";
export { run as runGroup } from "../commands/run.js";
export { systemPromptCommand } from "../commands/system-prompt.js";
export { testCommand } from "../commands/test.js";
export { traceCommand } from "../commands/trace.js";
//# sourceMappingURL=index.d.ts.map