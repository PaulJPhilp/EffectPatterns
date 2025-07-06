import { Effect, Fiber } from "effect";

const program = Effect.gen(function* () {
  const fiberCount = 100_000;
  yield* Effect.log(`Forking ${fiberCount} fibers...`);

  // Create an array of 100,000 simple effects
  const tasks = Array.from({ length: fiberCount }, (_, i) =>
    Effect.sleep("1 second").pipe(Effect.as(i)),
  );

  // Fork all of them into background fibers
  const fibers = yield* Effect.forEach(tasks, Effect.fork);

  yield* Effect.log("All fibers have been forked. Now waiting for them to complete...");

  // Wait for all fibers to finish their work
  const results = yield* Fiber.joinAll(fibers);

  yield* Effect.log(`All ${results.length} fibers have completed.`);
});

// This program runs successfully, demonstrating the low overhead of fibers.
Effect.runPromise(program);