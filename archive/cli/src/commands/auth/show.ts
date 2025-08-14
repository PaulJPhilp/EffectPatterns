import { Command, Options } from "@effect/cli";
import { Effect, Option } from "effect";
import { AuthService } from "../../services/auth-service/service.js";

export const authShow = Command.make(
  "show",
  {
    json: Options.boolean("json").pipe(Options.optional),
    output: Options.file("output").pipe(Options.optional, Options.withAlias("o")),
    quiet: Options.boolean("quiet").pipe(Options.optional, Options.withAlias("q")),
    verbose: Options.boolean("verbose").pipe(Options.optional, Options.withAlias("v")),
    noColor: Options.boolean("no-color").pipe(Options.optional),
    force: Options.boolean("force").pipe(Options.optional, Options.withAlias("f")),
  },
  ({ json, output, quiet }) =>
    Effect.gen(function* () {
      const auth = yield* AuthService;
      const config = yield* auth.getAllConfig();
      const jsonMode = Option.getOrElse(json, () => false);
      const quietMode = Option.getOrElse(quiet, () => false);

      const content = jsonMode
        ? JSON.stringify(config, null, 2)
        : JSON.stringify(config, null, 2);
      if (Option.isSome(output)) {
        // Future: write to file. For now, print for consistency with existing behavior
        yield* Effect.log(content);
        return;
      }
      if (!quietMode) {
        yield* Effect.log(content);
      }
    })
);
