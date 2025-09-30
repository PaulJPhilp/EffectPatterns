import { Effect, Option } from "effect";

type User = { id: number; name: string };

// Simulate a slower cache lookup that might find nothing (None)
const checkCache: Effect.Effect<Option.Option<User>> = Effect.succeed(
  Option.none()
).pipe(
  Effect.delay("200 millis") // Made slower so database wins
);

// Simulate a faster database query that will always find the data
const queryDatabase: Effect.Effect<Option.Option<User>> = Effect.succeed(
  Option.some({ id: 1, name: "Paul" })
).pipe(
  Effect.delay("50 millis") // Made faster so it wins the race
);

// Race them. The database should win and return the user data.
const program = Effect.race(checkCache, queryDatabase).pipe(
  // The result of the race is an Option, so we can handle it.
  Effect.flatMap((result: Option.Option<User>) =>
    Option.match(result, {
      onNone: () => Effect.fail("User not found anywhere."),
      onSome: (user) => Effect.succeed(user),
    })
  )
);

// In this case, the database wins the race.
const programWithResults = Effect.gen(function* () {
  try {
    const user = yield* program;
    yield* Effect.log(`User found: ${JSON.stringify(user)}`);
    return user;
  } catch (error) {
    yield* Effect.logError(`Error: ${error}`);
    throw error;
  }
}).pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Effect.logError(`Handled error: ${error}`);
      return null;
    })
  )
);

Effect.runPromise(programWithResults);

// Also demonstrate with logging
const programWithLogging = Effect.gen(function* () {
  yield* Effect.logInfo("Starting race between cache and database...");

  try {
    const user = yield* program;
    yield* Effect.logInfo(
      `Success: Found user ${user.name} with ID ${user.id}`
    );
    return user;
  } catch (error) {
    yield* Effect.logInfo("This won't be reached due to Effect error handling");
    return null;
  }
}).pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Effect.logInfo(`Handled error: ${error}`);
      return null;
    })
  )
);

Effect.runPromise(programWithLogging);
