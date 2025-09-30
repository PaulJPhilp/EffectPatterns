import { Clock, Effect } from "effect";

// Mock function to simulate fetching a user by ID
const fetchUserById = (id: number) =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`Fetching user ${id}...`);
    yield* Effect.sleep("1 second"); // Simulate network delay
    return { id, name: `User ${id}`, email: `user${id}@example.com` };
  });

const userIds = Array.from({ length: 10 }, (_, i) => i + 1);

// Process the entire array, but only run 5 fetches at a time.
const program = Effect.gen(function* () {
  yield* Effect.logInfo("Starting parallel processing...");

  const startTime = yield* Clock.currentTimeMillis;
  const users = yield* Effect.forEach(userIds, fetchUserById, {
    concurrency: 5, // Limit to 5 concurrent operations
  });
  const endTime = yield* Clock.currentTimeMillis;

  yield* Effect.logInfo(
    `Processed ${users.length} users in ${endTime - startTime}ms`
  );
  yield* Effect.logInfo(
    `First few users: ${JSON.stringify(users.slice(0, 3), null, 2)}`
  );

  return users;
});

// The result will be an array of all user objects.
// The total time will be much less than running them sequentially.
Effect.runPromise(program);
