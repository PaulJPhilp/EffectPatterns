import { Effect } from "effect";

const userIds = Array.from({ length: 100 }, (_, i) => i + 1);

// A function that simulates fetching a single user's data
const fetchUserById = (id: number): Effect.Effect<{ id: number; name: string }> =>
  Effect.succeed({ id, name: `User ${id}` }).pipe(
    Effect.delay(Math.random() * 100), // Simulate variable network latency
  );

// Process the entire array, but only run 10 fetches at a time.
const program = Effect.forEach(userIds, fetchUserById, {
  concurrency: 10,
});

// The result will be an array of all 100 user objects.
// The total time will be much less than running them sequentially.
Effect.runPromise(program);