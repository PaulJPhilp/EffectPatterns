import { Command } from "@effect/cli";
import { Option } from "effect";
import { RunService } from "../../services/run-service/service.js";
export declare const runCreate: Command.Command<"create", RunService, import("@effect/platform/Error").PlatformError, {
    readonly prefix: Option.Option<string>;
    readonly quiet: Option.Option<boolean>;
}>;
//# sourceMappingURL=create.d.ts.map