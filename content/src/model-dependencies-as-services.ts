import { Effect } from "effect";

// Define Random service with production implementation as default
export class Random extends Effect.Service<Random>()(
  "Random",
  {
    // Default production implementation
    sync: () => ({
      next: Effect.sync(() => Math.random())
    })
  }
) {}

// Example usage
const program = Effect.gen(function* () {
  const random = yield* Random;
  const value = yield* random.next;
  return value;
});

// Run with default implementation
Effect.runPromise(
  Effect.provide(
    program,
    Random.Default
  )
).then(value => console.log('Random value:', value));