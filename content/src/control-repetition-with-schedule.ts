import { Effect, Schedule, Duration } from "effect"

// A simple effect that can fail
const flakyEffect = Effect.try({
  try: () => {
    if (Math.random() > 0.2) {
      throw new Error("Transient error")
    }
    return "Operation succeeded!"
  },
  catch: (error: unknown) => {
    // we can omit this entirely
    return error
  }
}).pipe(
  Effect.tapError(
    () => Effect.logInfo("Operation failed, retrying...")
  )
)

// --- Building a Composable Schedule ---

// 1. Start with a base exponential backoff (100ms, 200ms, 400ms...)
const exponentialBackoff = Schedule.exponential("100 millis")

// 2. Add random jitter to avoid thundering herd problems
const withJitter = Schedule.jittered(exponentialBackoff)

// 3. Limit the schedule to a maximum of 5 repetitions
const limitedWithJitter = Schedule.compose(
  withJitter,
  Schedule.recurs(5)
)

// --- Using the Schedule ---
const program = Effect.gen(function* () {
  yield* Effect.logInfo("Starting operation...")
  const result = yield* Effect.retry(flakyEffect, limitedWithJitter)
  yield* Effect.logInfo(`Final result: ${result}`)
})

// Run the program
Effect.runPromise(program)