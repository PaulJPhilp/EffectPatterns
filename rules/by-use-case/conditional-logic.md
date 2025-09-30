# Conditional Logic Patterns

## Conditional Branching with if, when, and cond

Use combinators such as if, when, and cond to branch computations based on runtime conditions, without imperative if statements.

### Example

```typescript
import { Effect, Stream, Option, Either } from "effect";

// Effect: Branch based on a condition
const effect = Effect.if(true, {
  onTrue: () => Effect.succeed("yes"),
  onFalse: () => Effect.succeed("no")
}); // Effect<string>

// Option: Conditionally create an Option
const option = true ? Option.some("yes") : Option.none(); // Option<string> (Some("yes"))

// Either: Conditionally create an Either
const either = true
  ? Either.right("yes")
  : Either.left("error"); // Either<string, string> (Right("yes"))

// Stream: Conditionally emit a stream
const stream = false
  ? Stream.fromIterable([1, 2])
  : Stream.empty; // Stream<number> (empty)
```

**Explanation:**  
These combinators let you branch your computation based on a boolean or predicate, without leaving the world of composable, type-safe code.  
You can also use `when` to run an effect only if a condition is true, or `unless` to run it only if a condition is false.

---

## Filtering Results with filter

Use filter to declaratively express conditional logic, keeping only values that satisfy a predicate.

### Example

```typescript
import { Effect, Stream, Option, Either } from "effect";

// Effect: Only succeed if the value is even, fail otherwise
const effect = Effect.succeed(4).pipe(
  Effect.filterOrFail(
    (n): n is number => n % 2 === 0,
    () => "Number is not even"
  )
); // Effect<number, string>

// Option: Only keep the value if it is even
const option = Option.some(4).pipe(
  Option.filter((n): n is number => n % 2 === 0)
); // Option<number>

// Either: Use map and flatMap to filter
const either = Either.right(4).pipe(
  Either.flatMap((n) => 
    n % 2 === 0
      ? Either.right(n)
      : Either.left("Number is not even")
  )
); // Either<string, number>

// Stream: Only emit even numbers
const stream = Stream.fromIterable([1, 2, 3, 4]).pipe(
  Stream.filter((n): n is number => n % 2 === 0)
); // Stream<number>
```

**Explanation:**  
`filter` applies a predicate to the value(s) inside the structure. If the predicate fails, the result is a failure (`Effect.fail`, `Either.left`), `Option.none`, or an empty stream.

---

