import { Data, Effect } from "effect"

// Define our tagged error type
class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly cause: unknown
}> {}

// Function that simulates a database error
const findUser = (id: number): Effect.Effect<{ id: number; name: string }, DatabaseError> =>
  Effect.gen(function* () {
    if (id < 0) {
      return yield* Effect.fail(new DatabaseError({ cause: "Invalid ID" }))
    }
    return { id, name: `User ${id}` }
  })

// Create a program that demonstrates error handling
const program = Effect.gen(function* () {
  // Try to find a valid user
  yield* Effect.logInfo("Looking up user 1...")
  yield* Effect.gen(function* () {
    const user = yield* findUser(1)
    yield* Effect.logInfo(`Found user: ${JSON.stringify(user)}`)
  }).pipe(
    Effect.catchAll((error) =>
      Effect.logInfo(`Error finding user: ${error._tag} - ${error.cause}`)
    )
  )

  // Try to find an invalid user
  yield* Effect.logInfo("\nLooking up user -1...")
  yield* Effect.gen(function* () {
    const user = yield* findUser(-1)
    yield* Effect.logInfo(`Found user: ${JSON.stringify(user)}`)
  }).pipe(
    Effect.catchTag("DatabaseError", (error) =>
      Effect.logInfo(`Database error: ${error._tag} - ${error.cause}`)
    )
  )
})

// Run the program
Effect.runPromise(program)