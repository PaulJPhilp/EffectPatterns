import { Command } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Console, Effect, Option } from "effect";
import { RunService } from "../../services/run-service/service.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { ensureInsideRunsDir, hasRunInfo, resolveRunDir } from "./utils.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { optForce, optName, optQuiet } from "../_shared.js";
export const runDelete = Command.make("delete", {
    name: optName("Name of the run to delete"),
    force: optForce("Force deletion; required to delete a run"),
    quiet: optQuiet("Suppress output (only delete the run)"),
}, ({ name, force, quiet }) => Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const runService = yield* RunService;
    const isForce = Option.getOrElse(force, () => false);
    const isQuiet = Option.getOrElse(quiet, () => false);
    const runDir = yield* resolveRunDir(name);
    const ok = yield* ensureInsideRunsDir(runDir);
    if (!ok)
        return;
    const exists = yield* fs.exists(runDir);
    if (!exists) {
        return yield* Console.error(`Run not found: ${name}`);
    }
    const hasInfo = yield* hasRunInfo(runDir);
    if (!hasInfo) {
        return yield* Console.error(`Refusing to delete directory without run-info.json: ${name}`);
    }
    if (!isForce) {
        return yield* Console.error(`Refusing to delete without --force. To delete run '${name}', pass --force`);
    }
    // If deleting the active run, clear the pointer
    const current = yield* runService.getCurrentRun();
    if (current && current.runDirectory === runDir) {
        yield* runService.clearCurrentRun();
    }
    yield* fs.remove(runDir, { recursive: true });
    if (!isQuiet) {
        yield* Effect.log(`Deleted run: ${name}`);
    }
})).pipe(Command.withDescription("Delete a run directory"));
//# sourceMappingURL=delete.js.map