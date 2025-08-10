import { Args, Command } from "@effect/cli";
import { Effect } from "effect";
import { AuthService } from "../../services/auth-service/service.js";

export const authRemove = Command.make(
  "remove",
  {
    provider: Args.text({ name: "provider" }),
  },
  ({ provider }) =>
    Effect.gen(function* () {
      const auth = yield* AuthService;
      yield* auth.removeApiKey(provider);
      yield* Effect.log(`✅ API key removed for ${provider}`);
    })
);
