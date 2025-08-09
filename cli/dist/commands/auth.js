import { Args, Command, Options } from "@effect/cli";
import { Console, Effect, Option } from "effect";
import { AuthService } from "../services/auth-service/service.js";
const authSet = Command.make("set", {
    provider: Args.text({ name: "provider" }),
    apiKey: Args.text({ name: "api-key" }),
}, ({ provider, apiKey }) => Effect.gen(function* () {
    const auth = yield* AuthService;
    yield* auth.setApiKey(provider, apiKey);
    yield* Console.log(`✅ API key set for ${provider}`);
}));
const authGet = Command.make("get", {
    provider: Args.text({ name: "provider" }),
}, ({ provider }) => Effect.gen(function* () {
    const auth = yield* AuthService;
    const apiKey = yield* auth.getApiKey(provider);
    if (apiKey._tag === "Some") {
        yield* Console.log(`API key for ${provider}: ${apiKey.value.slice(0, 4)}***${apiKey.value.slice(-4)}`);
    }
    else {
        yield* Console.log(`❌ No API key found for ${provider}`);
    }
}));
const authRemove = Command.make("remove", {
    provider: Args.text({ name: "provider" }),
}, ({ provider }) => Effect.gen(function* () {
    const auth = yield* AuthService;
    yield* auth.removeApiKey(provider);
    yield* Console.log(`✅ API key removed for ${provider}`);
}));
const authList = Command.make("list", {}, () => Effect.gen(function* () {
    const auth = yield* AuthService;
    const providers = yield* auth.listProviders();
    if (providers.length === 0) {
        yield* Console.log("No providers configured");
    }
    else {
        yield* Console.log("Configured providers:");
        for (const provider of providers) {
            yield* Console.log(`- ${provider}`);
        }
    }
}));
const authShow = Command.make("show", {
    json: Options.boolean("json").pipe(Options.optional),
    output: Options.file("output").pipe(Options.optional, Options.withAlias("o")),
    quiet: Options.boolean("quiet").pipe(Options.optional, Options.withAlias("q")),
    verbose: Options.boolean("verbose").pipe(Options.optional, Options.withAlias("v")),
    noColor: Options.boolean("no-color").pipe(Options.optional),
    force: Options.boolean("force").pipe(Options.optional, Options.withAlias("f")),
}, ({ json, output, quiet }) => Effect.gen(function* () {
    const auth = yield* AuthService;
    const config = yield* auth.getAllConfig();
    const jsonMode = Option.getOrElse(json, () => false);
    const quietMode = Option.getOrElse(quiet, () => false);
    const content = jsonMode
        ? JSON.stringify(config, null, 2)
        : JSON.stringify(config, null, 2);
    if (Option.isSome(output)) {
        // real write expected in future; for now print
        yield* Console.log(content);
        return;
    }
    if (!quietMode) {
        yield* Console.log(content);
    }
}));
export const authCommand = Command.make("auth").pipe(Command.withSubcommands([authSet, authGet, authRemove, authList, authShow]));
