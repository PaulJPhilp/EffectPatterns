import { Effect } from "effect";

const getPostsWithGen = Effect.gen(function* () {
  const response = yield* Effect.tryPromise(() => fetch("..."));
  const user = yield* Effect.tryPromise(() => response.json() as Promise<any>);
  // ... more steps
  return user;
});