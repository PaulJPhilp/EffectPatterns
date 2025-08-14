import { Command } from "@effect/cli";
import { Option } from "effect";
import { PlanError_InvalidRetries, PlanError_InvalidRetryMs, PlanError_InvalidFallbackSpec } from "../errors.js";
import { ConfigService } from "../../services/config-service/service.js";
export declare const planCreate: Command.Command<"create", ConfigService | import("../../services/output-handler/service.js").OutputHandlerService, import("../../services/config-service/errors.js").ConfigError | import("@effect/platform/Error").BadArgument | import("@effect/platform/Error").SystemError | import("../../services/output-handler/errors.js").OutputHandlerError | PlanError_InvalidRetries | PlanError_InvalidRetryMs | PlanError_InvalidFallbackSpec, {
    readonly retries: Option.Option<number>;
    readonly retryMs: Option.Option<number>;
    readonly fallbacks: Option.Option<string>;
    readonly output: Option.Option<string>;
}>;
//# sourceMappingURL=create.d.ts.map