import { Effect } from "effect";

const randomNumber = Effect.sync(() => Math.random());

const parseJson = (input: string) =>
  Effect.try({
    try: () => JSON.parse(input),
    catch: (error) => new Error(`JSON parsing failed: ${error}`),
  });

// More examples of wrapping synchronous computations
const divide = (a: number, b: number) =>
  Effect.try({
    try: () => {
      if (b === 0) throw new Error("Division by zero");
      return a / b;
    },
    catch: (error) => new Error(`Division failed: ${error}`),
  });

const processString = (str: string) =>
  Effect.sync(() => {
    console.log(`Processing string: "${str}"`);
    return str.toUpperCase().split("").reverse().join("");
  });

// Demonstrate wrapping synchronous computations
const program = Effect.gen(function* () {
  console.log("=== Wrapping Synchronous Computations Demo ===");

  // Example 1: Basic sync computation
  console.log("\n1. Basic sync computation (random number):");
  const random1 = yield* randomNumber;
  const random2 = yield* randomNumber;
  console.log(`Random numbers: ${random1.toFixed(4)}, ${random2.toFixed(4)}`);

  // Example 2: Successful JSON parsing
  console.log("\n2. Successful JSON parsing:");
  const validJson = '{"name": "Paul", "age": 30}';
  const parsed = yield* parseJson(validJson).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        console.log(`Parsing failed: ${error.message}`);
        return { error: "Failed to parse" };
      })
    )
  );
  console.log("Parsed JSON:", parsed);

  // Example 3: Failed JSON parsing with error handling
  console.log("\n3. Failed JSON parsing with error handling:");
  const invalidJson = '{"name": "Paul", "age":}';
  const parsedWithError = yield* parseJson(invalidJson).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        console.log(`Parsing failed: ${error.message}`);
        return { error: "Invalid JSON", input: invalidJson };
      })
    )
  );
  console.log("Error result:", parsedWithError);

  // Example 4: Division with error handling
  console.log("\n4. Division with error handling:");
  const division1 = yield* divide(10, 2).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        console.log(`Division error: ${error.message}`);
        return -1;
      })
    )
  );
  console.log(`10 / 2 = ${division1}`);

  const division2 = yield* divide(10, 0).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        console.log(`Division error: ${error.message}`);
        return -1;
      })
    )
  );
  console.log(`10 / 0 = ${division2} (error handled)`);

  // Example 5: String processing
  console.log("\n5. String processing:");
  const processed = yield* processString("Hello Effect");
  console.log(`Processed result: "${processed}"`);

  // Example 6: Combining multiple sync operations
  console.log("\n6. Combining multiple sync operations:");
  const combined = yield* Effect.gen(function* () {
    const num = yield* randomNumber;
    const multiplied = yield* Effect.sync(() => num * 100);
    const rounded = yield* Effect.sync(() => Math.round(multiplied));
    return rounded;
  });
  console.log(`Combined operations result: ${combined}`);

  console.log("\n✅ Synchronous computations demonstration completed!");
});

Effect.runPromise(program);
