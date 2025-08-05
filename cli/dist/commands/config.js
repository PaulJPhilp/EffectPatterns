import { Command, Args } from "@effect/cli";
import { Console, Effect, Option } from "effect";
import { ConfigService } from "../services/config-service/service.js";
const configGet = Command.make("get", { key: Args.text({ name: "key" }) }, ({ key }) => Effect.gen(function* () {
    const config = yield* ConfigService;
    const value = yield* config.get(key);
    const output = Option.match(value, {
        onNone: () => `Key '${key}' not found`,
        onSome: (v) => v
    });
    yield* Console.log(output);
}));
const configSet = Command.make("set", { key: Args.text({ name: "key" }), value: Args.text({ name: "value" }) }, ({ key, value }) => Effect.gen(function* () {
    const config = yield* ConfigService;
    yield* config.set(key, value);
    yield* Console.log(`Set ${key}=${value}`);
}));
const configList = Command.make("list", {}, () => Effect.gen(function* () {
    const config = yield* ConfigService;
    const allConfig = yield* config.list();
    yield* Console.log(JSON.stringify(allConfig, null, 2));
}));
export const configCommand = Command.make("config").pipe(Command.withSubcommands([configGet, configSet, configList]));
