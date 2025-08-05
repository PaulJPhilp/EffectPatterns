import { Command, Args } from "@effect/cli";
import { Console, Effect } from "effect";
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
const authShow = Command.make("show", {}, () => Effect.gen(function* () {
    const auth = yield* AuthService;
    const config = yield* auth.getAllConfig();
    yield* Console.log(JSON.stringify(config, null, 2));
}));
export const authCommand = Command.make("auth").pipe(Command.withSubcommands([authSet, authGet, authRemove, authList, authShow]));
