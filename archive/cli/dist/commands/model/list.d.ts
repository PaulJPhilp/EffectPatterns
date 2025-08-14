import { Command } from "@effect/cli";
import { Option as EffectOption } from "effect";
import { ConfigService } from "../../services/config-service/service.js";
export declare const modelList: Command.Command<"list", ConfigService, import("../../services/config-service/errors.js").ConfigError, {
    readonly provider: EffectOption.Option<string>;
}>;
//# sourceMappingURL=list.d.ts.map