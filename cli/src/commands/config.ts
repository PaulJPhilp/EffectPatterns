import { Args, Command, Options } from "@effect/cli";
import { Console, Effect, Option } from "effect";
import { ConfigService } from "../services/config-service/service.js";

const configGet = Command.make(
  "get",
  { key: Args.text({ name: "key" }) },
  ({ key }) =>
    Effect.gen(function* () {
      const config = yield* ConfigService;
      const value = yield* config.get(key);
      const output = Option.match(value, {
        onNone: () => `Key '${key}' not found`,
        onSome: (v) => v,
      });
      yield* Console.log(output);
    })
);

const configSet = Command.make(
  "set",
  { key: Args.text({ name: "key" }), value: Args.text({ name: "value" }) },
  ({ key, value }) =>
    Effect.gen(function* () {
      const config = yield* ConfigService;
      yield* config.set(key, value);
      yield* Console.log(`Set ${key}=${value}`);
    })
);

const configList = Command.make(
  "list",
  {
    json: Options.boolean("json").pipe(Options.optional),
    output: Options.file("output").pipe(
      Options.optional,
      Options.withAlias("o")
    ),
    force: Options.boolean("force").pipe(
      Options.optional,
      Options.withAlias("f")
    ),
    quiet: Options.boolean("quiet").pipe(
      Options.optional,
      Options.withAlias("q")
    ),
    verbose: Options.boolean("verbose").pipe(
      Options.optional,
      Options.withAlias("v")
    ),
    noColor: Options.boolean("no-color").pipe(Options.optional),
  },
  ({ json, output, quiet }) =>
    Effect.gen(function* () {
      const config = yield* ConfigService;
      const allConfig = yield* config.list();
      const content = JSON.stringify(allConfig, null, 2);
      if (Option.isSome(output)) {
        yield* Console.log(content);
        return;
      }
      if (!Option.getOrElse(quiet, () => false)) {
        yield* Console.log(content);
      }
    })
);

export const configCommand = Command.make("config").pipe(
  Command.withSubcommands([configGet, configSet, configList])
);
