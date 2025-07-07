import { Effect, Queue, Fiber } from "effect";

const program = Effect.gen(function* () {
  yield* Effect.logInfo("Starting queue demo...");

  // Create a bounded queue that can hold a maximum of 10 items.
  // This prevents memory issues by applying backpressure when the queue is full.
  // If a producer tries to add to a full queue, it will suspend until space is available.
  const queue = yield* Queue.bounded<string>(10);
  yield* Effect.logInfo("Created bounded queue");

  // Producer Fiber: Add a job to the queue every second.
  // This fiber runs independently and continuously produces work items.
  // The producer-consumer pattern decouples work generation from work processing.
  const producer = yield* Effect.gen(function* () {
    let i = 0;
    while (true) {
      const job = `job-${i++}`;
      yield* Effect.logInfo(`Producing ${job}...`);

      // Queue.offer adds an item to the queue. If the queue is full,
      // this operation will suspend the fiber until space becomes available.
      // This provides natural backpressure control.
      yield* Queue.offer(queue, job);

      // Sleep for 500ms between job creation. This controls the production rate.
      // Producer is faster than consumer (500ms vs 1000ms) to demonstrate queue buffering.
      yield* Effect.sleep("500 millis");
    }
  }).pipe(Effect.fork); // Fork creates a new fiber that runs concurrently

  yield* Effect.logInfo("Started producer fiber");

  // Worker Fiber: Take a job from the queue and process it.
  // This fiber runs independently and processes work items as they become available.
  // Multiple workers could be created to scale processing capacity.
  const worker = yield* Effect.gen(function* () {
    while (true) {
      // Queue.take removes and returns an item from the queue.
      // If the queue is empty, this operation will suspend the fiber
      // until an item becomes available. This prevents busy-waiting.
      const job = yield* Queue.take(queue);
      yield* Effect.logInfo(`Processing ${job}...`);

      // Simulate work by sleeping for 1 second.
      // This makes the worker slower than the producer, causing queue buildup.
      yield* Effect.sleep("1 second");
      yield* Effect.logInfo(`Completed ${job}`);
    }
  }).pipe(Effect.fork); // Fork creates another independent fiber

  yield* Effect.logInfo("Started worker fiber");

  // Let them run for a while...
  // The main fiber sleeps while the producer and worker fibers run concurrently.
  // During this time, you'll see the queue acting as a buffer between
  // the fast producer and slow worker.
  yield* Effect.logInfo("Running for 10 seconds...");
  yield* Effect.sleep("10 seconds");
  yield* Effect.logInfo("Done!");

  // Interrupt both fibers to clean up resources.
  // Fiber.interrupt sends an interruption signal to the fiber,
  // allowing it to perform cleanup operations before terminating.
  // This is safer than forcefully killing fibers.
  yield* Fiber.interrupt(producer);
  yield* Fiber.interrupt(worker);

  // Note: In a real application, you might want to:
  // 1. Drain the queue before interrupting workers
  // 2. Use Fiber.join to wait for graceful shutdown
  // 3. Handle interruption signals in the fiber loops
});

// Run the program
// This demonstrates the producer-consumer pattern with Effect fibers:
// - Fibers are lightweight threads that can be created in large numbers
// - Queues provide safe communication between fibers
// - Backpressure prevents resource exhaustion
// - Interruption allows for graceful shutdown
Effect.runPromise(program);
