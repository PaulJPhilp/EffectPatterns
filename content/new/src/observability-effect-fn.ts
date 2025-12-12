import { Effect } from "effect";

// A simple function to instrument
function add(a: number, b: number): number {
  return a + b;
}

// Use Effect.fn to instrument the function with observability
const addWithLogging = Effect.fn("add")(add).pipe(
  Effect.withSpan("add", { attributes: { "fn.name": "add" } })
);

// Use the instrumented function in an Effect workflow
const program = Effect.gen(function* () {
  yield* Effect.logInfo("Calling add function");
  const sum = yield* addWithLogging(2, 3);
  yield* Effect.logInfo(`Sum is ${sum}`);
  return sum;
});

// Run the program
Effect.runPromise(program);