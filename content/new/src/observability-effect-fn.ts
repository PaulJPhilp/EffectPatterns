import { Effect } from "effect";

// A simple function to instrument
function add(a: number, b: number): number {
  return a + b;
}

// Wrap the function with Effect.fn to add logging
const addWithLogging = Effect.fn((a: number, b: number) =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`Calling add with ${a} and ${b}`);
    const result = add(a, b);
    yield* Effect.logInfo(`Result: ${result}`);
    return result;
  })
);

// Use the instrumented function in an Effect workflow
const program = addWithLogging(2, 3).pipe(
  Effect.tap((sum) => Effect.logInfo(`Sum is ${sum}`))
);

// Run the program
Effect.runPromise(program);