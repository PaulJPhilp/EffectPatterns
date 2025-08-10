import { Args, Command } from "@effect/cli";
import { Effect } from "effect";
import { AuthService } from "../../services/auth-service/service.js";

export const authSet = Command.make(
  "set",
  {
    provider: Args.text({ name: "provider" }),
    apiKey: Args.text({ name: "api-key" }),
  },
  ({ provider, apiKey }) =>
    Effect.gen(function* () {
      const auth = yield* AuthService;
      yield* auth.setApiKey(provider, apiKey);
      yield* Effect.log(`✅ API key set for ${provider}`);
    })
);
