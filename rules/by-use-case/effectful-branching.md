# Effectful Branching Patterns

## Effectful Pattern Matching with matchEffect

Use matchEffect to pattern match on the result of an Effect, running effectful logic for both success and failure cases.

### Example

```typescript
import { Effect } from "effect";

// Effect: Run different Effects on success or failure
const effect = Effect.fail("Oops!").pipe(
  Effect.matchEffect({
    onFailure: (err) => Effect.logError(`Error: ${err}`),
    onSuccess: (value) => Effect.log(`Success: ${value}`),
  })
); // Effect<void>
```

**Explanation:**  
- `matchEffect` allows you to run an Effect for both the success and failure cases.
- This is useful for logging, cleanup, retries, or any effectful side effect that depends on the outcome.

---

