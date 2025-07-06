import { Effect, Queue } from "effect";

const program = Effect.gen(function* () {
  // Create a bounded queue that can hold a maximum of 10 items.
  const queue = yield* Queue.bounded<string>(10);

  // Producer Fiber: Add a job to the queue every second.
  const producer = Effect.gen(function* () {
    let i = 0;
    while (true) {
      yield* Queue.offer(queue, `job-${i++}`);
      yield* Effect.sleep("1 second");
    }
  }).pipe(Effect.fork);

  // Worker Fiber: Take a job from the queue and process it.
  const worker = Effect.gen(function* () {
    while (true) {
      const job = yield* Queue.take(queue);
      yield* Effect.log(`Processing ${job}...`);
      yield* Effect.sleep("2 seconds"); // Simulate work
    }
  }).pipe(Effect.fork);

  // Let them run for a while...
  yield* Effect.sleep("10 seconds");
});