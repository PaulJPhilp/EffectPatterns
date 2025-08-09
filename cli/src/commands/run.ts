import { Command, Options } from "@effect/cli";
import { FileSystem, Path } from "@effect/platform";
import { Console, Effect, Option } from "effect";
import { RunService } from "../services/run-service/service.js";

const runCreate = Command.make(
  "create",
  {
    prefix: Options.text("prefix").pipe(
      Options.optional,
      Options.withAlias("p")
    ),
    quiet: Options.boolean("quiet").pipe(
      Options.optional,
      Options.withAlias("q")
    ),
  },
  ({ prefix, quiet }) =>
    Effect.gen(function* () {
      const runService = yield* RunService;
      const isQuiet = Option.getOrElse(quiet, () => false);
      const pref = Option.getOrElse(prefix, () => undefined);
      const info = yield* runService.createRunDirectory(pref);
      if (!isQuiet) {
        yield* Console.log(`Run created: ${info.runName}`);
        yield* Console.log(`Directory: ${info.runDirectory}`);
      }
    })
);

const runCurrent = Command.make("current", {}, () =>
  Effect.gen(function* () {
    const runService = yield* RunService;
    const current = yield* runService.getCurrentRun();
    if (!current) {
      yield* Console.log("No active run");
      return;
    }
    yield* Console.log(JSON.stringify(current, null, 2));
  })
);

const runPath = Command.make("path", {}, () =>
  Effect.gen(function* () {
    const runService = yield* RunService;
    const p = yield* runService.getRunPath();
    yield* Console.log(p);
  })
);

const runList = Command.make("list", {}, () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const runsDir = path.join(process.cwd(), "runs");
    const exists = yield* fs.exists(runsDir);
    if (!exists) {
      yield* Console.log("No runs found");
      return;
    }
    const entries = yield* fs.readDirectory(runsDir);
    if (entries.length === 0) {
      yield* Console.log("No runs found");
      return;
    }
    for (const name of entries) {
      yield* Console.log(name);
    }
  })
);

export const runCommand = Command.make("run").pipe(
  Command.withSubcommands([runCreate, runCurrent, runPath, runList])
);

// Add: run use <runName>
export const runUse = Command.make(
  "use",
  { name: Options.text("name") },
  ({ name }) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const runService = yield* RunService;

      const runsDir = path.join(process.cwd(), "runs");
      const runDir = path.resolve(runsDir, name);

      // Safety: ensure resolved path is inside runsDir
      const normalizedRuns = path.resolve(runsDir);
      // Require runDir to either equal runsDir/<name> or be a child of runsDir
      if (
        !(runDir === normalizedRuns || runDir.startsWith(`${normalizedRuns}/`))
      ) {
        return yield* Console.error("Invalid run name path");
      }

      const exists = yield* fs.exists(runDir);
      if (!exists) {
        return yield* Console.error(`Run not found: ${name}`);
      }

      const infoPath = path.join(runDir, "run-info.json");
      const hasInfo = yield* fs.exists(infoPath);
      if (!hasInfo) {
        return yield* Console.error(`run-info.json missing for: ${name}`);
      }

      const content = yield* fs.readFileString(infoPath);
      const info = JSON.parse(content);
      yield* runService.setCurrentRun(info);
      yield* Console.log(`Now using run: ${name}`);
    })
);

// Add: run delete <runName> [--force]
export const runDelete = Command.make(
  "delete",
  {
    name: Options.text("name"),
    force: Options.boolean("force").pipe(
      Options.optional,
      Options.withAlias("f")
    ),
    quiet: Options.boolean("quiet").pipe(
      Options.optional,
      Options.withAlias("q")
    ),
  },
  ({ name, force, quiet }) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const runService = yield* RunService;
      const isForce = Option.getOrElse(force, () => false);
      const isQuiet = Option.getOrElse(quiet, () => false);

      const runsDir = path.join(process.cwd(), "runs");
      const runDir = path.resolve(runsDir, name);

      // Safety: ensure resolved path is inside runsDir and matches a directory with run-info.json
      const normalizedRuns = path.resolve(runsDir);
      if (
        !(runDir === normalizedRuns || runDir.startsWith(`${normalizedRuns}/`))
      ) {
        return yield* Console.error("Invalid run name path");
      }

      const exists = yield* fs.exists(runDir);
      if (!exists) {
        return yield* Console.error(`Run not found: ${name}`);
      }

      const infoPath = path.join(runDir, "run-info.json");
      const hasInfo = yield* fs.exists(infoPath);
      if (!hasInfo) {
        return yield* Console.error(
          `Refusing to delete directory without run-info.json: ${name}`
        );
      }

      if (!isForce) {
        return yield* Console.error(
          `Refusing to delete without --force. To delete run '${name}', pass --force`
        );
      }

      // If deleting the active run, clear the pointer
      const current = yield* runService.getCurrentRun();
      if (current && current.runDirectory === runDir) {
        yield* runService.clearCurrentRun();
      }

      yield* fs.remove(runDir, { recursive: true });
      if (!isQuiet) {
        yield* Console.log(`Deleted run: ${name}`);
      }
    })
);

// Rebuild run command to include new subcommands
export const run = Command.make("run").pipe(
  Command.withSubcommands([
    runCreate,
    runCurrent,
    runPath,
    runList,
    runUse,
    runDelete,
  ])
);
