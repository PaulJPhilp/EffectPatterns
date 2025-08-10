import { Command, Options } from "@effect/cli";
import { Option } from "effect";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { runCreate } from "./create.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { runCurrent } from "./current.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { runPath } from "./path.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { runList } from "./list.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { runUse } from "./use.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { runDelete } from "./delete.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS resolves .js to .ts in this repo config
import { makeCommandGroup, setGlobalCompact, setGlobalJson } from "../_shared.js";

export const run = makeCommandGroup(
  "run",
  {
    json: Options.boolean("json").pipe(
      Options.optional,
      Options.withDescription(
        "Output JSON when supported by a subcommand"
      )
    ),
    compact: Options.boolean("compact").pipe(
      Options.optional,
      Options.withDescription("Compact JSON output (no pretty-print)")
    ),
  },
  [runCreate, runCurrent, runPath, runList, runUse, runDelete],
  {
    description: "Manage runs (create, use, list, path, current, delete)",
    onInit: ({ json, compact }) => {
      const globalJson = Option.getOrElse(
        json as Option.Option<boolean>,
        () => false
      );
      const globalCompact = Option.getOrElse(
        compact as Option.Option<boolean>,
        () => false
      );
      setGlobalJson(globalJson);
      setGlobalCompact(globalCompact);
    },
  }
);
