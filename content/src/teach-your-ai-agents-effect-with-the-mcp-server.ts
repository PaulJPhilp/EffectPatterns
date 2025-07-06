// The AI generates this correct code:
import { Effect } from "effect";
import { UserService } from "./features/User/UserService";
const program = Effect.gen(function* () {
  const userService = yield* UserService;

  const user = yield* userService.getUser("123");
  yield* Effect.log(`Found user: ${user.name}`);
});