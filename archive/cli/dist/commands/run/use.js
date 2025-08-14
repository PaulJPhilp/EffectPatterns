import { Command } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Effect } from "effect";
import { RunService } from "../../services/run-service/service.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { ensureInsideRunsDir, readRunInfo, resolveRunDir } from "./utils.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { optName } from "../_shared.js";
export const runUse = Command.make("use", { name: optName("Name of the run to activate") }, ({ name }) => Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const runService = yield* RunService;
    const runDir = yield* resolveRunDir(name);
    const ok = yield* ensureInsideRunsDir(runDir);
    if (!ok)
        return;
    const exists = yield* fs.exists(runDir);
    if (!exists) {
        // match original message
        yield* Effect.logError(`Run not found: ${name}`);
        return;
    }
    const info = yield* readRunInfo(runDir);
    if (info === null)
        return;
    yield* runService.setCurrentRun(info);
    yield* Effect.log(`Now using run: ${name}`);
})).pipe(Command.withDescription("Switch the active run by name"));
//# sourceMappingURL=use.js.map