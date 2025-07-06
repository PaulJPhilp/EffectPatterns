import { Effect, Data } from "effect";

interface DbErrorType {
  readonly _tag: "DbError"
  readonly message: string
}

const DbError = Data.tagged<DbErrorType>("DbError");

interface User { name: string; }

class HttpClient extends Effect.Service<HttpClient>()(
  "HttpClient",
  {
    sync: () => ({
      findById: (id: number): Effect.Effect<User, DbErrorType> =>
        Effect.try({
          try: () => ({ name: "Paul" }),
          catch: () => DbError({ message: "Failed to find user" })
        })
    })
  }
) {}

const findUser = (id: number) =>
  Effect.gen(function* () {
    const client = yield* HttpClient;
    return yield* client.findById(id);
  });