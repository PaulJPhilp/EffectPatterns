# Constructors Patterns

## Converting from Nullable, Option, or Either

Use fromNullable, fromOption, and fromEither to lift nullable values, Option, or Either into Effects or Streams for safe, typeful interop.

### Example

```typescript
import { Effect, Option, Either } from "effect";

// Option: Convert a nullable value to an Option
const nullableValue: string | null = Math.random() > 0.5 ? "hello" : null;
const option = Option.fromNullable(nullableValue); // Option<string>

// Effect: Convert an Option to an Effect that may fail
const someValue = Option.some(42);
const effectFromOption = Option.match(someValue, {
  onNone: () => Effect.fail("No value"),
  onSome: (value) => Effect.succeed(value)
}); // Effect<number, string, never>

// Effect: Convert an Either to an Effect
const either = Either.right("success");
const effectFromEither = Either.match(either, {
  onLeft: (error) => Effect.fail(error),
  onRight: (value) => Effect.succeed(value)
}); // Effect<string, never, never>
```

**Explanation:**  
- `Effect.fromNullable` lifts a nullable value into an Effect, failing if the value is `null` or `undefined`.
- `Effect.fromOption` lifts an Option into an Effect, failing if the Option is `none`.
- `Effect.fromEither` lifts an Either into an Effect, failing if the Either is `left`.

---

## Creating from Collections

Use fromIterable and fromArray to lift collections into Streams or Effects for batch or streaming processing.

### Example

```typescript
import { Stream, Effect } from "effect";

// Stream: Create a stream from an array
const numbers = [1, 2, 3, 4];
const numberStream = Stream.fromIterable(numbers); // Stream<number>

// Stream: Create a stream from any iterable
function* gen() {
  yield "a";
  yield "b";
}
const letterStream = Stream.fromIterable(gen()); // Stream<string>

// Effect: Create an effect from an array of effects (batch)
const effects = [Effect.succeed(1), Effect.succeed(2)];
const batchEffect = Effect.all(effects); // Effect<[1, 2]>
```

**Explanation:**  
- `Stream.fromIterable` creates a stream from any array or iterable, enabling streaming and batch operations.
- `Effect.all` (covered elsewhere) can be used to process arrays of effects in batch.

---

## Creating from Synchronous and Callback Code

Use sync and async to create Effects from synchronous or callback-based computations, making them composable and type-safe.

### Example

```typescript
import { Effect } from "effect";

// Synchronous: Wrap a computation that is guaranteed not to throw
const effectSync = Effect.sync(() => Math.random()); // Effect<never, number, never>

// Callback-based: Wrap a Node.js-style callback API
function legacyReadFile(
  path: string,
  cb: (err: Error | null, data?: string) => void
) {
  setTimeout(() => cb(null, "file contents"), 10);
}

const effectAsync = Effect.async<string, Error>((resume) => {
  legacyReadFile("file.txt", (err, data) => {
    if (err) resume(Effect.fail(err));
    else if (data) resume(Effect.succeed(data));
  });
}); // Effect<string, Error, never>

```

**Explanation:**  
- `Effect.sync` is for synchronous computations that are guaranteed not to throw.
- `Effect.async` is for integrating callback-based APIs, converting them into Effects.

---

## Lifting Errors and Absence with fail, none, and left

Use fail, none, and left to create Effect, Option, or Either that represent failure or absence.

### Example

```typescript
import { Effect, Option, Either } from "effect";

// Effect: Represent a failure with an error value
const effect = Effect.fail("Something went wrong"); // Effect<string, never, never>

// Option: Represent absence of a value
const option = Option.none(); // Option<never>

// Either: Represent a failure with a left value
const either = Either.left("Invalid input"); // Either<string, never>
```

**Explanation:**  
- `Effect.fail(error)` creates an effect that always fails with `error`.
- `Option.none()` creates an option that is always absent.
- `Either.left(error)` creates an either that always represents failure.

---

## Lifting Values with succeed, some, and right

Use succeed, some, and right to create Effect, Option, or Either from plain values.

### Example

```typescript
import { Effect, Option, Either } from "effect";

// Effect: Lift a value into an Effect that always succeeds
const effect = Effect.succeed(42); // Effect<never, number, never>

// Option: Lift a value into an Option that is always Some
const option = Option.some("hello"); // Option<string>

// Either: Lift a value into an Either that is always Right
const either = Either.right({ id: 1 }); // Either<never, { id: number }>
```

**Explanation:**  
- `Effect.succeed(value)` creates an effect that always succeeds with `value`.
- `Option.some(value)` creates an option that is always present.
- `Either.right(value)` creates an either that always represents success.

---

## Wrapping Synchronous and Asynchronous Computations

Use try and tryPromise to lift code that may throw or reject into Effect, capturing errors in the failure channel.

### Example

```typescript
import { Effect } from "effect";

// Synchronous: Wrap code that may throw
const effectSync = Effect.try({
  try: () => JSON.parse("{ invalid json }"),
  catch: (error) => `Parse error: ${String(error)}`
}); // Effect<string, never, never>

// Asynchronous: Wrap a promise that may reject
const effectAsync = Effect.tryPromise({
  try: () => fetch("https://api.example.com/data").then(res => res.json()),
  catch: (error) => `Network error: ${String(error)}`
}); // Effect<string, any, never>
```

**Explanation:**  
- `Effect.try` wraps a synchronous computation that may throw, capturing the error in the failure channel.
- `Effect.tryPromise` wraps an async computation (Promise) that may reject, capturing the rejection as a failure.

---

