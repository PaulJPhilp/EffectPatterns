# Pattern Guidance: Model domain errors as Tagged Errors

## Finding
**Error Modeling Anti-Pattern:** Function returns `Effect<T, Error>` (or `unknown`) instead of a union of specific error types.

## What this means (plain language)
When you use generic `Error`, you force callers to handle "everything could fail, but I don't know how." Tagged errors let you be explicit: "this fails with either a `ValidationError` or a `NetworkError`, and here's how to recover from each."

---

## Use when
- your function can fail in multiple *distinct* ways (validation, timeout, auth, resource exhaustion)
- callers need to decide behavior based on *which* error occurred
- you're in your Effect domain layer (services, handlers, business logic)
- you want error handling at call sites to be exhaustive/type-safe

---

## Avoid when
- the error is a true accident / defect (use `Cause` / `sandbox` instead)
- you're at the HTTP boundary (errors should be pre-mapped to status codes before reaching the response serializer)
- the error is a third-party library exception you're just bubbling up (wrap it in a domain error first)

---

## Decision rule (reduces ambiguity)
**Decision rule:**
For every code path that can fail, ask: "What does the caller do differently based on *why* it failed?"

- If the answer is "different recovery logic," create a tagged error.
- If the answer is "log it and propagate," it's a defect (sandbox it).
- If the answer is "convert to HTTP status," it's a boundary error (map post-hoc).

**Simplifier:**
Errors are *data*. Tag them so your code can pattern-match on them.

---

## Architecture impact
**Domain impact**
- Errors become part of your service contract (visible in the return type).
- Call sites are forced to be explicit about recovery logic (no accidental ignoring of failures).
- Refactoring is safer: changing error types is a compile-time error, not a runtime surprise.

**Boundary/runtime impact**
- Errors must be serialized/mapped at the HTTP boundary (tagging happens in domain, mapping happens in route handler).
- Observability improves: you can categorize failures by error tag and alert differently per tag.
- Retry/timeout policies become granular (retry `NetworkError`, don't retry `ValidationError`).

---

## Implementation prompt (for your workflow)
Use this *verbatim* as the follow-up instruction to a coding assistant:

**"Implement the Fix Plan for this finding: Identify all code paths in this function that can fail. For each path, create a tagged error type (e.g., `UserNotFound | InvalidCredentials | DatabaseTimeout`). Replace generic `Error` with this union. Update the function signature. Update all call sites to use `catchTag` for targeted recovery."**

---

## Fix Plan (Steps + Diff summary + Risks)
**Steps**
1. Enumerate the distinct failure modes in your function.
2. Create a tagged error type for each (or a union if multiple functions).
3. Replace `throw new Error(...)` with the appropriate tagged error.
4. Update function signature from `Effect<T, Error>` to `Effect<T, UnionOfErrors>`.
5. Update call sites to handle each error with `catchTag` (or a switch/if-chain).
6. Consider: should some errors trigger retries? Define that in the outer handler.

**What will change (summary)**
- Function signature becomes more specific: `Effect<User, UserNotFound | InvalidCredentials>`.
- Call sites shift from try/catch to `catchTag` + exhaustive matching.
- Error recovery becomes declarative (easier to audit and test).

**Risks / watch-outs**
- If you have 10+ call sites, update them all at once (or introduce an adapter to ease the migration).
- Be careful not to over-tag: if 90% of callers treat two errors the same way, consider unioning them.
- Errors that escape to HTTP boundaries must still be serialized (not all errors are recoverable; some become 500s).

---

## Example
**Before:**
```typescript
export const findUser = (id: string): Effect<User, Error> =>
  Effect.tryPromise(() => db.query("SELECT * FROM users WHERE id = ?", [id]))
    .pipe(
      Effect.flatMap((rows) =>
        rows.length === 0
          ? Effect.fail(new Error("Not found"))
          : Effect.succeed(rows[0])
      )
    );
```

**After:**
```typescript
export class UserNotFound {
  readonly _tag = "UserNotFound";
  constructor(readonly userId: string) {}
}

export class DatabaseError {
  readonly _tag = "DatabaseError";
  constructor(readonly cause: unknown) {}
}

export const findUser = (id: string): Effect<User, UserNotFound | DatabaseError> =>
  Effect.tryPromise(() => db.query("SELECT * FROM users WHERE id = ?", [id]))
    .pipe(
      Effect.mapError((cause) => new DatabaseError(cause)),
      Effect.flatMap((rows) =>
        rows.length === 0
          ? Effect.fail(new UserNotFound(id))
          : Effect.succeed(rows[0])
      )
    );

// Call site: now exhaustive and explicit
Effect.match(
  findUser(userId),
  {
    onSuccess: (user) => console.log(`Found: ${user.name}`),
    onFailure: (error) =>
      error._tag === "UserNotFound"
        ? console.error(`User ${error.userId} not found`)
        : console.error(`Database error: ${error.cause}`),
  }
);
```

---

## Related patterns
See also:
- **throw-in-effect-code** — use `Effect.fail` with tagged errors instead of throwing
- **try-catch-in-effect** — replace catch blocks with `catchTag` for typed recovery
