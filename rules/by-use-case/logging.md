# Logging Patterns

## Leverage Effect's Built-in Structured Logging

Use Effect.log, Effect.logInfo, and Effect.logError to add structured, context-aware logging to your Effect code.

### Example

```typescript
import { Effect } from "effect";

// Log a simple message
const program = Effect.log("Starting the application");

// Log at different levels
const info = Effect.logInfo("User signed in");
const error = Effect.logError("Failed to connect to database");

// Log with dynamic values
const userId = 42;
const logUser = Effect.logInfo(`Processing user: ${userId}`);

// Use logging in a workflow
const workflow = Effect.gen(function* () {
  yield* Effect.log("Beginning workflow");
  // ... do some work
  yield* Effect.logInfo("Workflow step completed");
  // ... handle errors
  yield* Effect.logError("Something went wrong");
});
```

**Explanation:**  
- `Effect.log` logs a message at the default level.
- `Effect.logInfo` and `Effect.logError` log at specific levels.
- Logging is context-aware and can be used anywhere in your Effect workflows.

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

