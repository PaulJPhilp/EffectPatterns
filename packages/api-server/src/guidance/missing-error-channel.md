# Pattern Guidance: Promise all failure paths in the error type

## Finding
**Type Contract Anti-Pattern:** Function signature says it never fails (`Effect<T, never>`) but the implementation can throw, fail, or be cancelled.

## What this means (plain language)
When a function's error channel is `never` (or suspiciously empty), callers believe the operation can't fail. But if the code can throw, timeout, or hit a database error, that assumption is broken. Callers won't add error handling, and failures become surprises at runtime—often escaping the supervisor.

---

## Use when
Use `Effect<T, never>` only when:
- the operation genuinely cannot fail (pure computation, in-memory lookup)
- all error cases are handled internally (wrapped in `Effect.catchAll`)
- all side effects are infallible (no I/O, no parsing, no delegation to fallible code)

---

## Avoid when
Avoid missing error channels when:
- you make external API calls (network can fail)
- you touch databases or filesystems (queries can fail, resources exhausted)
- you parse input or deserialize data (invalid data raises errors)
- you use `Effect.tryPromise` without error mapping
- the function delegates to code that can fail

---

## Decision rule
For each function, ask:
- "Can this code be cancelled?" → Yes: add an error type for cancellation.
- "Can external I/O fail?" → Yes: add error types for each failure mode.
- "Does the implementation throw or use promises?" → Yes: add error types or handle them internally.

**Simplifier**
`never` error channel = caller thinks this can't fail. If it can, add the error type to the signature.

---

## Goal
Keep failures typed, supervised, and recoverable.

---

## Architecture impact
**Domain impact**
- Type contract is broken; callers trust the signature and skip error handling.
- Refactoring breaks callers silently: if you add an error case later, existing code doesn't know.
- Testing becomes incomplete: tests pass without error cases, but production fails.

**Boundary/runtime impact**
- Unhandled errors escape the supervisor (or crash the fiber).
- Observability fails: errors can't be caught by Effect error handlers, so they don't show up in traces.
- Retry/timeout policies don't work (you can't retry what the type says never fails).
- Boundary serialization breaks: if an error does escape, JSON.stringify may fail.

---

## Implementation prompt
"Implement the Fix Plan for this finding: identify all failure paths in this function. Add error types to the signature (create a union if multiple modes), and update call sites to handle each error type."

---

## Fix Plan (Steps + Diff summary + Risks)
**Steps**
1. Trace the function: list all operations that can fail (promises, queries, parsing, delegates).
2. For each failure, create or add an error type (or use an existing union).
3. Update the return type from `Effect<T, never>` to `Effect<T, UnionOfErrors>`.
4. For internal error handling, use `Effect.catchTag` or `Effect.catchAll`.
5. Update call sites to handle the new error types.

**What will change (summary)**
- Function signature is now honest: callers know what can fail.
- Call sites must handle errors (compiler enforces it).
- Error recovery becomes explicit and testable.

**Risks / watch-outs**
- If many call sites exist, update them all at once (or introduce an adapter).
- Some errors may not be recoverable at the call site (bubble them up).
- Over-promising errors can break downstream (only add error types that are actionable).

---

## Example
**Before:**
```typescript
export const getUserSettings = (userId: string): Effect<Settings, never> =>
  Effect.gen(function* () {
    // Makes a network call: can fail
    const user = yield* Effect.tryPromise(() =>
      fetch(`/api/users/${userId}`).then(r => r.json())
    );

    // Signature says never, but this can throw!
    return { theme: user.theme, notifications: user.notifications };
  });

// Caller trusts the signature—no error handling
yield* getUserSettings(userId);  // If network fails: unhandled error
```

**After:**
```typescript
export class NetworkError {
  readonly _tag = "NetworkError";
  constructor(readonly cause: unknown) {}
}

export class UserNotFound {
  readonly _tag = "UserNotFound";
  constructor(readonly userId: string) {}
}

export const getUserSettings = (userId: string): Effect<Settings, NetworkError | UserNotFound> =>
  Effect.gen(function* () {
    const user = yield* Effect.tryPromise(
      () => fetch(`/api/users/${userId}`).then(r => r.json()),
      (cause) => new NetworkError(cause)
    );

    if (!user) {
      yield* Effect.fail(new UserNotFound(userId));
    }

    return { theme: user.theme, notifications: user.notifications };
  });

// Caller now handles errors explicitly
yield* Effect.match(
  getUserSettings(userId),
  {
    onSuccess: (settings) => console.log("Settings:", settings),
    onFailure: (error) =>
      error._tag === "NetworkError"
        ? console.error("Network failed; retry?")
        : console.error("User not found"),
  }
);
```

---

## Related patterns
See also:
- **generic-error-type** — once you add error types, model them as tagged unions for exhaustive recovery
- **throw-in-effect-code** — thrown exceptions also break the error channel; use `Effect.fail` instead
