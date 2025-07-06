import { Effect, Option } from "effect";

// Simulate a fast cache lookup that might find nothing (None)
const checkCache = Effect.succeed(Option.none()).pipe(
  Effect.delay("10 millis"),
);

// Simulate a slower database query that will always find the data
const queryDatabase = Effect.succeed(Option.some({ id: 1, name: "Paul" })).pipe(
  Effect.delay("100 millis"),
);

// Race them. If the cache had returned Some(user), it would have won,
// and the database query would have been instantly interrupted.
const program = Effect.race(checkCache, queryDatabase).pipe(
  // The result of the race is an Option, so we can handle it.
  Effect.flatMap(Option.match({
    onNone: () => Effect.fail("User not found anywhere."),
    onSome: (user) => Effect.succeed(user),
  })),
);

// In this case, the database wins the race.
Effect.runPromise(program).then(console.log); // { id: 1, name: 'Paul' }