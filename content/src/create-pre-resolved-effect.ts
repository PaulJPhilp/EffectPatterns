import { Effect, Data } from "effect"

// Create a custom error type
class MyError extends Data.TaggedError("MyError") {}

// Create a program that demonstrates pre-resolved effects
const program = Effect.gen(function* () {
  // Success effect
  yield* Effect.logInfo("Running success effect...")
  yield* Effect.gen(function* () {
    const value = yield* Effect.succeed(42)
    yield* Effect.logInfo(`Success value: ${value}`)
  })

  // Failure effect
  yield* Effect.logInfo("\nRunning failure effect...")
  yield* Effect.gen(function* () {
    yield* Effect.fail(new MyError())
  }).pipe(
    Effect.catchTag("MyError", (error) =>
      Effect.logInfo(`Error occurred: ${error._tag}`)
    )
  )
})

// Run the program
Effect.runPromise(program)