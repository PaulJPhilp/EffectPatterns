import { Effect } from "effect";

const program = Effect.succeed(5).pipe(
  Effect.map((n) => n * 2),
  Effect.map((n) => `The result is ${n}`),
  Effect.tap(Effect.log)
);

// Demonstrate various pipe composition patterns
const demo = Effect.gen(function* () {
  console.log("=== Using Pipe for Composition Demo ===");

  // 1. Basic pipe composition
  console.log("\n1. Basic pipe composition:");
  yield* program;

  // 2. Complex pipe composition with multiple transformations
  console.log("\n2. Complex pipe composition:");
  const complexResult = yield* Effect.succeed(10).pipe(
    Effect.map((n) => n + 5),
    Effect.map((n) => n * 2),
    Effect.tap((n) =>
      Effect.sync(() => console.log(`Intermediate result: ${n}`))
    ),
    Effect.map((n) => n.toString()),
    Effect.map((s) => `Final: ${s}`)
  );
  console.log("Complex result:", complexResult);

  // 3. Pipe with flatMap for chaining effects
  console.log("\n3. Pipe with flatMap for chaining effects:");
  const chainedResult = yield* Effect.succeed("hello").pipe(
    Effect.map((s) => s.toUpperCase()),
    Effect.flatMap((s) => Effect.succeed(`${s} WORLD`)),
    Effect.flatMap((s) => Effect.succeed(`${s}!`)),
    Effect.tap((s) => Effect.sync(() => console.log(`Chained: ${s}`)))
  );
  console.log("Chained result:", chainedResult);

  // 4. Pipe with error handling
  console.log("\n4. Pipe with error handling:");
  const errorHandledResult = yield* Effect.succeed(-1).pipe(
    Effect.flatMap((n) =>
      n > 0 ? Effect.succeed(n) : Effect.fail(new Error("Negative number"))
    ),
    Effect.catchAll((error) =>
      Effect.succeed("Handled error: " + error.message)
    ),
    Effect.tap((result) =>
      Effect.sync(() => console.log(`Error handled: ${result}`))
    )
  );
  console.log("Error handled result:", errorHandledResult);

  // 5. Pipe with multiple operations
  console.log("\n5. Pipe with multiple operations:");
  const multiOpResult = yield* Effect.succeed([1, 2, 3, 4, 5]).pipe(
    Effect.map((arr) => arr.filter((n) => n % 2 === 0)),
    Effect.map((arr) => arr.map((n) => n * 2)),
    Effect.map((arr) => arr.reduce((sum, n) => sum + n, 0)),
    Effect.tap((sum) =>
      Effect.sync(() => console.log(`Sum of even numbers doubled: ${sum}`))
    )
  );
  console.log("Multi-operation result:", multiOpResult);

  console.log("\n✅ Pipe composition demonstration completed!");
});

Effect.runPromise(demo);
