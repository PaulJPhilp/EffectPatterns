# Pattern Guidance: Let errors propagate to the right handling layer

**Goal: Error recovery happens at the right level, where context is available.**

## Use when
- You are at a natural boundary (HTTP handler, CLI entry point) where you know how to respond to an error.
- You have context and can map the error to a meaningful response (HTTP status, log, user message).
- The handler is typed to accept the error (part of its error channel).

## Avoid when
- You catch an error inside a helper function and swallow it or log it superficially.
- You catch an error and return a generic `null` or `undefined` (losing the error information).
- You catch an error that another layer up would handle better.
- You catch errors from internal dependencies (let them bubble up to their owner).

## Decision rule
Ask: "Can I meaningfully recover from this error at this layer?"
- Yes → Catch and handle it.
- No → Let it propagate.

If the answer is "I don't know what to do, so I'll log and move on," you're catching too early.

**Simplifier**
Catch only where you can decide what to do next. Propagate uncertainty upward.

## Goal
Error recovery happens at the right level, where context is available.

---

## Architecture impact
**Domain impact**
- Errors are caught and swallowed deep in domain logic, losing context.
- Caller doesn't know the operation failed.
- Debugging is hard: the real error was caught and logged three layers down.

**Boundary/runtime impact**
- Observability: errors disappear into logs instead of showing up in structured traces.
- Retry logic is confused: by the time the error is seen, it's been transformed into a success.
- Response handling is wrong: handler thinks everything succeeded, but it didn't.
- Testing: tests pass locally but fail in production because the error was hidden.

---

## Implementation prompt
"Implement the Fix Plan for this finding: Remove the catch block inside the domain/service function. Let the error propagate to the handler. Add error handling at the boundary (HTTP handler, CLI, queue consumer) where the error can be meaningfully transformed to a response."

---

## Fix Plan (Steps + Diff summary + Risks)
**Steps**
1. Identify the catch block that is handling an error too early.
2. Remove the catch (or transform it to be more specific).
3. Let the error propagate to the caller.
4. Add error handling at the boundary (HTTP handler, CLI, etc.) that knows how to respond.
5. Test: verify errors bubble up correctly and are handled at the boundary.

**What will change (summary)**
- Errors propagate to the appropriate layer.
- Boundaries are responsible for translating domain errors to responses.
- Observability improves: errors are logged once with full context.

**Risks / watch-outs**
- Propagating errors changes the function's type signature (adds error channels).
- Call sites must handle the new error (or propagate further).
- Some errors may need to be caught in the middle for cleanup (use scoped/acquire-release instead).

---

## Example
**Before:**
```typescript
export const validateAndSaveUser = (user: UserInput): Effect<User, never> =>
  Effect.gen(function* () {
    try {
      const validated = yield* validateUserSchema(user);
      const saved = yield* db.save(validated);
      return saved;
    } catch (error) {
      // ❌ Catching too early! Swallowing the error.
      console.error("Validation failed:", error);
      return null as any;  // Returns null, error is lost
    }
  });

// HTTP handler
export async function POST(request: NextRequest) {
  const input = await request.json();
  const result = await Effect.runPromise(validateAndSaveUser(input));

  if (result === null) {
    // Too late: we don't know what went wrong
    return NextResponse.json({ error: "Something failed" }, { status: 500 });
  }

  return NextResponse.json(result);
}
```

**After:**
```typescript
export class ValidationError {
  readonly _tag = "ValidationError";
  constructor(readonly message: string) {}
}

export class DatabaseError {
  readonly _tag = "DatabaseError";
  constructor(readonly cause: unknown) {}
}

export const validateAndSaveUser = (
  user: UserInput
): Effect<User, ValidationError | DatabaseError> =>
  Effect.gen(function* () {
    // Let errors propagate; let the boundary decide how to handle them
    const validated = yield* validateUserSchema(user).pipe(
      Effect.mapError((cause) => new ValidationError(cause.message))
    );
    const saved = yield* db.save(validated).pipe(
      Effect.mapError((cause) => new DatabaseError(cause))
    );
    return saved;
  });

// HTTP handler - the right place to handle domain errors
export async function POST(request: NextRequest) {
  const input = await request.json();
  const result = await Effect.runPromise(validateAndSaveUser(input));

  return result.pipe(
    Effect.match(
      {
        onSuccess: (user) => NextResponse.json(user),
        onFailure: (error) => {
          if (error._tag === "ValidationError") {
            return NextResponse.json(
              { error: error.message },
              { status: 400 }  // Client error
            );
          }
          if (error._tag === "DatabaseError") {
            return NextResponse.json(
              { error: "Database error" },
              { status: 500 }  // Server error
            );
          }
        },
      }
    )
  );
}

// Now: errors propagate with full context, handler knows exactly what went wrong
```

---

## Related patterns
See also:
- **throw-in-effect-code** — similar issue: exceptions should surface at the right layer
- **generic-error-type** — use tagged errors to make error types explicit at each layer
