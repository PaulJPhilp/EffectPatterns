import { Effect, Fiber } from "effect";

const program = Effect.gen(function* () {
  // Demonstrate the lightweight nature of fibers by creating 100,000 of them
  // This would be impossible with OS threads due to memory and context switching overhead
  const fiberCount = 100_000;
  yield* Effect.log(`Forking ${fiberCount} fibers...`);

  // Create an array of 100,000 simple effects
  // Each effect sleeps for 1 second and then returns its index
  // This simulates lightweight concurrent tasks
  const tasks = Array.from({ length: fiberCount }, (_, i) =>
    Effect.sleep("1 second").pipe(Effect.as(i))
  );

  // Fork all of them into background fibers
  // Effect.fork creates a new fiber for each task without blocking
  // This demonstrates fiber creation scalability - 100k fibers created almost instantly
  // Each fiber is much lighter than an OS thread (typically ~1KB vs ~8MB per thread)
  const fibers = yield* Effect.forEach(tasks, Effect.fork);

  yield* Effect.log(
    "All fibers have been forked. Now waiting for them to complete..."
  );

  // Wait for all fibers to finish their work
  // Fiber.joinAll waits for all fibers to complete and collects their results
  // This demonstrates fiber coordination - managing thousands of concurrent operations
  // The runtime efficiently schedules these fibers using a work-stealing thread pool
  const results = yield* Fiber.joinAll(fibers);

  yield* Effect.log(`All ${results.length} fibers have completed.`);

  // Key insights from this example:
  // 1. Fibers are extremely lightweight - 100k fibers use minimal memory
  // 2. Fiber creation is fast - no expensive OS thread allocation
  // 3. The Effect runtime efficiently schedules fibers across available CPU cores
  // 4. Fibers can be suspended and resumed without blocking OS threads
  // 5. This enables massive concurrency for I/O-bound operations
});

// This program runs successfully, demonstrating the low overhead of fibers.
// Try running this with OS threads - you'd likely hit system limits around 1000-10000 threads
// With fibers, 100k+ concurrent operations are easily achievable
Effect.runPromise(program);
