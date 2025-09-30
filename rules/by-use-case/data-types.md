# Data Types Patterns

## Accumulate Multiple Errors with Either

Use Either to model computations that may fail, making errors explicit and type-safe.

### Example

```typescript
import { Either } from "effect";

// Create a Right (success) or Left (failure)
const success = Either.right(42); // Either<never, number>
const failure = Either.left("Something went wrong"); // Either<string, never>

// Pattern match on Either
const result = success.pipe(
  Either.match({
    onLeft: (err) => `Error: ${err}`,
    onRight: (value) => `Value: ${value}`,
  })
); // string

// Combine multiple Eithers and accumulate errors
const e1 = Either.right(1);
const e2 = Either.left("fail1");
const e3 = Either.left("fail2");

const all = Either.all([e1, e2, e3]); // Either<string, [number, never, never]>
const rights = [e1, e2, e3].filter(Either.isRight); // Right values only
const lefts = [e1, e2, e3].filter(Either.isLeft); // Left values only

```

**Explanation:**  
- `Either.right(value)` represents success.
- `Either.left(error)` represents failure.
- Pattern matching ensures all cases are handled.
- You can accumulate errors or results from multiple Eithers.

---

## Comparing Data by Value with Data.struct

Use Data.struct to define objects whose equality is based on their contents, enabling safe and predictable comparisons.

### Example

```typescript
import { Data, Equal } from "effect";

// Create two structurally equal objects
const user1 = Data.struct({ id: 1, name: "Alice" });
const user2 = Data.struct({ id: 1, name: "Alice" });

// Compare by value, not reference
const areEqual = Equal.equals(user1, user2); // true

// Use in a HashSet or as keys in a Map
import { HashSet } from "effect";
const set = HashSet.make(user1);
console.log(HashSet.has(set, user2)); // true
```

**Explanation:**  
- `Data.struct` creates immutable objects with value-based equality.
- Use for domain entities, value objects, and when storing objects in sets or as map keys.
- Avoids bugs from reference-based comparison.

---

## Handle Unexpected Errors by Inspecting the Cause

Use Cause to inspect, analyze, and handle all possible failure modes of an Effect, including expected errors, defects, and interruptions.

### Example

```typescript
import { Cause, Effect } from "effect";

// An Effect that may fail with an error or defect
const program = Effect.try({
  try: () => {
    throw new Error("Unexpected failure!");
  },
  catch: (err) => err,
});

// Catch all causes and inspect them
const handled = program.pipe(
  Effect.catchAllCause((cause) =>
    Effect.sync(() => {
      if (Cause.isDie(cause)) {
        console.error("Defect (die):", Cause.pretty(cause));
      } else if (Cause.isFailure(cause)) {
        console.error("Expected error:", Cause.pretty(cause));
      } else if (Cause.isInterrupted(cause)) {
        console.error("Interrupted:", Cause.pretty(cause));
      }
      // Handle or rethrow as needed
    })
  )
);

```

**Explanation:**  
- `Cause` distinguishes between expected errors (`fail`), defects (`die`), and interruptions.
- Use `Cause.pretty` for human-readable error traces.
- Enables advanced error handling and debugging.

---

## Manage Shared State Safely with Ref

Use Ref to safely manage shared, mutable state in concurrent and effectful programs.

### Example

```typescript
import { Effect, Ref } from "effect";

// Create a Ref with an initial value
const makeCounter = Ref.make(0);

// Increment the counter atomically
const increment = makeCounter.pipe(
  Effect.flatMap((counter) =>
    Ref.update(counter, (n) => n + 1)
  )
);

// Read the current value
const getValue = makeCounter.pipe(
  Effect.flatMap((counter) => Ref.get(counter))
);

// Use Ref in a workflow
const program = Effect.gen(function* () {
  const counter = yield* Ref.make(0);
  yield* Ref.update(counter, (n) => n + 1);
  const value = yield* Ref.get(counter);
  yield* Effect.log(`Counter value: ${value}`);
});
```

**Explanation:**  
- `Ref` is an atomic, mutable reference for effectful and concurrent code.
- All operations are safe, composable, and free of race conditions.
- Use `Ref` for counters, caches, or any shared mutable state.

---

## Model Optional Values Safely with Option

Use Option to model values that may be present or absent, making absence explicit and type-safe.

### Example

```typescript
import { Option } from "effect";

// Create an Option from a value
const someValue = Option.some(42); // Option<number>
const noValue = Option.none(); // Option<never>

// Safely convert a nullable value to Option
const fromNullable = Option.fromNullable(Math.random() > 0.5 ? "hello" : null); // Option<string>

// Pattern match on Option
const result = someValue.pipe(
  Option.match({
    onNone: () => "No value",
    onSome: (n) => `Value: ${n}`,
  })
); // string

// Use Option in a workflow
function findUser(id: number): Option.Option<{ id: number; name: string }> {
  return id === 1 ? Option.some({ id, name: "Alice" }) : Option.none();
}

```

**Explanation:**  
- `Option.some(value)` represents a present value.
- `Option.none()` represents absence.
- `Option.fromNullable` safely lifts nullable values into Option.
- Pattern matching ensures all cases are handled.

---

## Modeling Effect Results with Exit

Use Exit to capture the outcome of an Effect, including success, failure, and defects, for robust error handling and coordination.

### Example

```typescript
import { Effect, Exit } from "effect";

// Run an Effect and capture its Exit value
const program = Effect.succeed(42);

const runAndCapture = Effect.runPromiseExit(program); // Promise<Exit<never, number>>

// Pattern match on Exit
runAndCapture.then((exit) => {
  if (Exit.isSuccess(exit)) {
    console.log("Success:", exit.value);
  } else if (Exit.isFailure(exit)) {
    console.error("Failure:", exit.cause);
  }
});
```

**Explanation:**  
- `Exit` captures both success (`Exit.success(value)`) and failure (`Exit.failure(cause)`).
- Use `Exit` for robust error handling, supervision, and coordination of concurrent effects.
- Pattern matching on `Exit` lets you handle all possible outcomes.

---

## Modeling Tagged Unions with Data.case

Use Data.case to define tagged unions (ADTs) for modeling domain-specific states and enabling exhaustive pattern matching.

### Example

```typescript
import { Data } from "effect";

// Define a tagged union for a simple state machine
type State = Data.TaggedEnum<{
  Loading: {}
  Success: { data: string }
  Failure: { error: string }
}>
const { Loading, Success, Failure } = Data.taggedEnum<State>()

// Create instances
const state1: State = Loading()
const state2: State = Success({ data: "Hello" })
const state3: State = Failure({ error: "Oops" })

// Pattern match on the state
function handleState(state: State): string {
  switch (state._tag) {
    case "Loading":
      return "Loading...";
    case "Success":
      return `Data: ${state.data}`;
    case "Failure":
      return `Error: ${state.error}`;
  }
}
```

**Explanation:**  
- `Data.case` creates tagged constructors for each state.
- The `_tag` property enables exhaustive pattern matching.
- Use for domain modeling, state machines, and error types.

---

## Redact and Handle Sensitive Data

Use Redacted to wrap sensitive values, preventing accidental exposure in logs or error messages.

### Example

```typescript
import { Redacted } from "effect";

// Wrap a sensitive value
const secret = Redacted.make("super-secret-password");

// Use the secret in your application logic
function authenticate(user: string, password: Redacted.Redacted<string>) {
  // ... authentication logic
}

// Logging or stringifying a Redacted value
console.log(`Password: ${secret}`); // Output: Password: <redacted>
console.log(String(secret)); // Output: <redacted>

```

**Explanation:**  
- `Redacted.make(value)` wraps a sensitive value.
- When logged or stringified, the value is replaced with `<redacted>`.
- Prevents accidental exposure of secrets in logs or error messages.

---

## Representing Time Spans with Duration

Use Duration to model and manipulate time spans, enabling safe and expressive time-based logic.

### Example

```typescript
import { Duration } from "effect";

// Create durations using helpers
const oneSecond = Duration.seconds(1);
const fiveMinutes = Duration.minutes(5);
const twoHours = Duration.hours(2);

// Add, subtract, and compare durations
const total = Duration.sum(oneSecond, fiveMinutes); // 5 min 1 sec
const isLonger = Duration.greaterThan(twoHours, fiveMinutes); // true

// Convert to milliseconds or human-readable format
const ms = Duration.toMillis(fiveMinutes); // 300000
const readable = Duration.format(oneSecond); // "1s"

```

**Explanation:**  
- `Duration` is immutable and type-safe.
- Use helpers for common intervals and arithmetic for composition.
- Prefer `Duration` over raw numbers for all time-based logic.

---

## Type Classes for Equality, Ordering, and Hashing with Data.Class

Use Data.Class to define and derive type classes for your data types, supporting composable equality, ordering, and hashing.

### Example

```typescript
import { Data, Equal, HashSet } from "effect";

// Define custom data types with structural equality
const user1 = Data.struct({ id: 1, name: "Alice" });
const user2 = Data.struct({ id: 1, name: "Alice" });
const user3 = Data.struct({ id: 2, name: "Bob" });

// Data.struct provides automatic structural equality
console.log(Equal.equals(user1, user2)); // true (same structure)
console.log(Equal.equals(user1, user3)); // false (different values)

// Use in a HashSet (works because Data.struct implements Equal)
const set = HashSet.make(user1);
console.log(HashSet.has(set, user2)); // true (structural equality)

// Create an array and use structural equality
const users = [user1, user3];
console.log(users.some((u) => Equal.equals(u, user2))); // true

```

**Explanation:**  
- `Data.Class.getEqual` derives an equality type class for your data type.
- `Data.Class.getOrder` derives an ordering type class, useful for sorting.
- `Data.Class.getHash` derives a hash function for use in sets and maps.
- These type classes make your types fully compatible with Effect’s collections and algorithms.

---

## Use Chunk for High-Performance Collections

Use Chunk to model immutable, high-performance collections for efficient data processing and transformation.

### Example

```typescript
import { Chunk } from "effect";

// Create a Chunk from an array
const numbers = Chunk.fromIterable([1, 2, 3, 4]); // Chunk<number>

// Map and filter over a Chunk
const doubled = numbers.pipe(Chunk.map((n) => n * 2)); // Chunk<number>
const evens = numbers.pipe(Chunk.filter((n) => n % 2 === 0)); // Chunk<number>

// Concatenate Chunks
const moreNumbers = Chunk.fromIterable([5, 6]);
const allNumbers = Chunk.appendAll(numbers, moreNumbers); // Chunk<number>

// Convert back to array
const arr = Chunk.toReadonlyArray(allNumbers); // readonly number[]
```

**Explanation:**  
- `Chunk` is immutable and optimized for performance.
- It supports efficient batch operations, concatenation, and transformation.
- Use `Chunk` in data pipelines, streaming, and concurrent scenarios.

---

## Work with Arbitrary-Precision Numbers using BigDecimal

Use BigDecimal to represent and compute with decimal numbers that require arbitrary precision, such as in finance or scientific domains.

### Example

```typescript
import { BigDecimal } from "effect";

// Create BigDecimal values
const a = BigDecimal.fromNumber(0.1);
const b = BigDecimal.fromNumber(0.2);

// Add, subtract, multiply, divide
const sum = BigDecimal.sum(a, b); // BigDecimal(0.3)
const product = BigDecimal.multiply(a, b); // BigDecimal(0.02)

// Compare values
const isEqual = BigDecimal.equals(sum, BigDecimal.fromNumber(0.3)); // true

// Convert to string or number
const asString = BigDecimal.format(BigDecimal.normalize(sum)); // "0.3"
const asNumber = BigDecimal.unsafeToNumber(sum); // 0.3
```

**Explanation:**  
- `BigDecimal` is immutable and supports precise decimal arithmetic.
- Use it for domains where rounding errors are unacceptable (e.g., finance, billing, scientific data).
- Avoids the pitfalls of floating-point math in JavaScript.

---

## Work with Dates and Times using DateTime

Use DateTime to represent and manipulate dates and times in a type-safe, immutable, and time-zone-aware way.

### Example

```typescript
import { DateTime } from "effect";

// Create a DateTime for the current instant (returns an Effect)
import { Effect } from "effect";

const program = Effect.gen(function* () {
  const now = yield* DateTime.now; // DateTime.Utc

  // Parse from ISO string
  const parsed = DateTime.unsafeMakeZoned("2024-07-19T12:34:56Z"); // DateTime.Zoned

  // Add or subtract durations
  const inOneHour = DateTime.add(now, { hours: 1 });
  const oneHourAgo = DateTime.subtract(now, { hours: 1 });

  // Format as ISO string
  const iso = DateTime.formatIso(now); // e.g., "2024-07-19T23:33:19.000Z"

  // Compare DateTimes
  const isBefore = DateTime.lessThan(oneHourAgo, now); // true

  return { now, inOneHour, oneHourAgo, iso, isBefore };
});

```

**Explanation:**  
- `DateTime` is immutable and time-zone-aware.
- Supports parsing, formatting, arithmetic, and comparison.
- Use for all date/time logic to avoid bugs with native `Date`.

---

## Work with Immutable Sets using HashSet

Use HashSet to represent sets of unique values with efficient, immutable operations for membership, union, intersection, and difference.

### Example

```typescript
import { HashSet } from "effect";

// Create a HashSet from an array
const setA = HashSet.fromIterable([1, 2, 3]);
const setB = HashSet.fromIterable([3, 4, 5]);

// Membership check
const hasTwo = HashSet.has(setA, 2); // true

// Union, intersection, difference
const union = HashSet.union(setA, setB);         // HashSet {1, 2, 3, 4, 5}
const intersection = HashSet.intersection(setA, setB); // HashSet {3}
const difference = HashSet.difference(setA, setB);     // HashSet {1, 2}

// Add and remove elements
const withSix = HashSet.add(setA, 6);    // HashSet {1, 2, 3, 6}
const withoutOne = HashSet.remove(setA, 1); // HashSet {2, 3}
```

**Explanation:**  
- `HashSet` is immutable and supports efficient set operations.
- Use it for membership checks, set algebra, and modeling unique collections.
- Safe for concurrent and functional workflows.

---

## Working with Immutable Arrays using Data.array

Use Data.array to define arrays whose equality is based on their contents, enabling safe, predictable comparisons and functional operations.

### Example

```typescript
import { Data, Equal } from "effect";

// Create two structurally equal arrays
const arr1 = Data.array([1, 2, 3]);
const arr2 = Data.array([1, 2, 3]);

// Compare by value, not reference
const areEqual = Equal.equals(arr1, arr2); // true

// Use arrays as keys in a HashSet or Map
import { HashSet } from "effect";
const set = HashSet.make(arr1);
console.log(HashSet.has(set, arr2)); // true

// Functional operations (map, filter, etc.)
const doubled = arr1.map((n) => n * 2); // Data.array([2, 4, 6])
```

**Explanation:**  
- `Data.array` creates immutable arrays with value-based equality.
- Useful for modeling ordered collections in a safe, functional way.
- Supports all standard array operations, but with immutability and structural equality.

---

## Working with Tuples using Data.tuple

Use Data.tuple to define tuples whose equality is based on their contents, enabling safe and predictable comparisons and pattern matching.

### Example

```typescript
import { Data, Equal } from "effect";

// Create two structurally equal tuples
const t1 = Data.tuple(1, "Alice");
const t2 = Data.tuple(1, "Alice");

// Compare by value, not reference
const areEqual = Equal.equals(t1, t2); // true

// Use tuples as keys in a HashSet or Map
import { HashSet } from "effect";
const set = HashSet.make(t1);
console.log(HashSet.has(set, t2)); // true

// Pattern matching on tuples
const [id, name] = t1; // id: number, name: string
```

**Explanation:**  
- `Data.tuple` creates immutable tuples with value-based equality.
- Useful for modeling pairs, coordinates, or any fixed-size, heterogeneous data.
- Supports safe pattern matching and collection operations.

---

