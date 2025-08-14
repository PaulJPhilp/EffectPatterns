import { Args, Command } from "@effect/cli";
import { Effect } from "effect";
import { AuthService } from "../../services/auth-service/service.js";

export const authGet = Command.make(
  "get",
  {
    provider: Args.text({ name: "provider" }),
  },
  ({ provider }) =>
    Effect.gen(function* () {
      const auth = yield* AuthService;
      const apiKey = yield* auth.getApiKey(provider);

      if (apiKey._tag === "Some") {
        yield* Effect.log(
          `API key for ${provider}: ${apiKey.value.slice(0, 4)}***${apiKey.value.slice(-4)}`
        );
      } else {
        yield* Effect.log(`❌ No API key found for ${provider}`);
      }
    })
);
