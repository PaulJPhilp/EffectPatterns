import { Schema, Effect, Data } from "effect"

// Define User schema and type
const UserSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String
})

type User = Schema.Schema.Type<typeof UserSchema>

// Define error type
class UserNotFound extends Data.TaggedError("UserNotFound")<{
  readonly id: number
}> {}

// Create database service implementation
export class Database extends Effect.Service<Database>()(
  "Database",
  {
    sync: () => ({
      getUser: (id: number) =>
        id === 1
          ? Effect.succeed({ id: 1, name: "John" })
          : Effect.fail(new UserNotFound({ id }))
    })
  }
) {}

// Create a program that demonstrates schema and error handling
const program = Effect.gen(function* () {
  const db = yield* Database
  
  // Try to get an existing user
  yield* Effect.logInfo("Looking up user 1...")
  const user1 = yield* db.getUser(1)
  yield* Effect.logInfo(`Found user: ${JSON.stringify(user1)}`)
  
  // Try to get a non-existent user
  yield* Effect.logInfo("\nLooking up user 999...")
  yield* Effect.logInfo("Attempting to get user 999...")
  yield* Effect.gen(function* () {
    const user = yield* db.getUser(999)
    yield* Effect.logInfo(`Found user: ${JSON.stringify(user)}`)
  }).pipe(
    Effect.catchAll((error) => {
      if (error instanceof UserNotFound) {
        return Effect.logInfo(`Error: User with id ${error.id} not found`)
      }
      return Effect.logInfo(`Unexpected error: ${error}`)
    })
  )

  // Try to decode invalid data
  yield* Effect.logInfo("\nTrying to decode invalid user data...")
  const invalidUser = { id: "not-a-number", name: 123 } as any
  yield* Effect.gen(function* () {
    const user = yield* Schema.decode(UserSchema)(invalidUser)
    yield* Effect.logInfo(`Decoded user: ${JSON.stringify(user)}`)
  }).pipe(
    Effect.catchAll((error) =>
      Effect.logInfo(`Validation failed:\n${JSON.stringify(error, null, 2)}`)
    )
  )
})

// Run the program
Effect.runPromise(
  Effect.provide(program, Database.Default)
)