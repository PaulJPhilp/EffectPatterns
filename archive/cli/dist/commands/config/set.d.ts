import { Command } from "@effect/cli";
import { Option } from "effect";
import { ConfigService } from "../../services/config-service/service.js";
export declare const configSet: Command.Command<"set", ConfigService | import("../../services/output-handler/service.js").OutputHandlerService, import("../../services/config-service/errors.js").ConfigError | import("@effect/platform/Error").BadArgument | import("@effect/platform/Error").SystemError | import("../../services/output-handler/errors.js").OutputHandlerError, {
    readonly key: string;
    readonly value: string;
    readonly output: Option.Option<string>;
}>;
//# sourceMappingURL=set.d.ts.map