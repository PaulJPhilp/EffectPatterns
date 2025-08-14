import { Command } from "@effect/cli";
import { Effect } from "effect";
import { RunService } from "../../services/run-service/service.js";
export const runPath = Command.make("path", {}, () => Effect.gen(function* () {
    const runService = yield* RunService;
    const p = yield* runService.getRunPath();
    yield* Effect.log(p);
})).pipe(Command.withDescription("Print the current run directory path"));
//# sourceMappingURL=path.js.map