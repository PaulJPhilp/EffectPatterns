# Tagged Unions Patterns

## Handling Specific Errors with catchTag and catchTags

Use catchTag and catchTags to handle specific tagged error types in the Effect failure channel, providing targeted recovery logic.

### Example

```typescript
import { Effect, Data } from "effect";

// Define tagged error types
class NotFoundError extends Data.TaggedError("NotFoundError")<{}> {}
class ValidationError extends Data.TaggedError("ValidationError")<{ message: string }> {}

type MyError = NotFoundError | ValidationError;

// Effect: Handle only ValidationError, let others propagate
const effect = Effect.fail(new ValidationError({ message: "Invalid input" }) as MyError).pipe(
  Effect.catchTag("ValidationError", (err) =>
    Effect.succeed(`Recovered from validation error: ${err.message}`)
  )
); // Effect<string>

// Effect: Handle multiple error tags
const effect2 = Effect.fail(new NotFoundError() as MyError).pipe(
  Effect.catchTags({
    NotFoundError: () => Effect.succeed("Handled not found!"),
    ValidationError: (err) => Effect.succeed(`Handled validation: ${err.message}`),
  })
); // Effect<string>
```

**Explanation:**  
- `catchTag` lets you recover from a specific tagged error type.
- `catchTags` lets you handle multiple tagged error types in one place.
- Unhandled errors continue to propagate, preserving error safety.

---

## Matching Tagged Unions with matchTag and matchTags

Use matchTag and matchTags to handle specific cases of tagged unions or custom error types in a declarative, type-safe way.

### Example

```typescript
import { Data, Effect } from "effect";

// Define a tagged error type
class NotFoundError extends Data.TaggedError("NotFoundError")<{}> {}
class ValidationError extends Data.TaggedError("ValidationError")<{
  message: string;
}> {}

type MyError = NotFoundError | ValidationError;

// Effect: Match on specific error tags
const effect: Effect.Effect<string, never, never> = Effect.fail(
  new ValidationError({ message: "Invalid input" }) as MyError
).pipe(
  Effect.catchTags({
    NotFoundError: () => Effect.succeed("Not found!"),
    ValidationError: (err) =>
      Effect.succeed(`Validation failed: ${err.message}`),
  })
); // Effect<string>

```

**Explanation:**  
- `matchTag` lets you branch on the specific tag of a tagged union or custom error type.
- This is safer and more maintainable than using `instanceof` or manual property checks.

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

