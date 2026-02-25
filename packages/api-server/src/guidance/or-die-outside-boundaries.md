# Pattern Guidance: Avoid orDie/orDieWith outside error boundary

**Goal: Errors are handled explicitly at boundaries, not converted to defects.**

## Use when
- You are at the application boundary (HTTP handler, CLI, queue consumer).
- You have already mapped all domain errors to appropriate responses.
- You know the Effect should never fail at this point (all errors handled earlier).

## Avoid when
- Using `orDie` in domain code to hide errors.
- Using `orDie` instead of handling a known error type.
- Using `orDie` to "simplify" error handling.
- Applying `orDie` to an Effect that can legitimately fail.

## Decision rule
`orDie` says: "If this fails, it's a bug, crash the system."
- Use `orDie` only if you're 100% sure the Effect won't fail.
- If there's any doubt, handle the error explicitly.
- If the error is expected, it's not a defect; map it instead.

**Simplifier**
orDie = "This should never fail. If it does, it's a bug."
If you're not sure → don't use orDie.

## Goal
Errors are handled explicitly at boundaries, not converted to defects.

---

## Architecture impact
**Domain impact**
- Errors are treated as defects (unrecoverable bugs) instead of domain events.
- Error recovery is impossible: the system crashes instead of responding gracefully.
- Observability loses error context: structured logging sees a crash, not a handled error.

**Boundary/runtime impact**
- Cascading failures: an error that should be handled as "bad input" crashes the service.
- Availability is fragile: common errors become unhandled exceptions.
- Testing is misleading: tests expect graceful handling, but production crashes.
- Metrics: error rates drop artificially (crashes aren't counted as errors, they're crashes).

---

## Implementation prompt
"Implement the Fix Plan for this finding: Remove `orDie` or `orDieWith`. Explicitly handle the error with `Effect.catchTag` or map it to a meaningful response. Test that errors are handled gracefully, not causing crashes."

---

## Fix Plan (Steps + Diff summary + Risks)
**Steps**
1. Identify the `orDie` or `orDieWith` call.
2. Determine what error could occur.
3. If the error is expected: add explicit handling (`Effect.catchAll`, `Effect.match`).
4. If the error truly should never happen: add a comment explaining why, then decide if `orDie` is justified.
5. Test: verify errors produce graceful responses, not crashes.

**What will change (summary)**
- Errors are mapped to meaningful responses (400, 500, etc.) instead of crashing.
- Observability improves: errors are structured logs, not unhandled exceptions.
- Availability improves: system stays running even on error.

**Risks / watch-outs**
- If you remove `orDie` but don't handle the error, the Effect's error channel changes (breaks callers).
- Some errors are truly unexpected; in that case, let them propagate (don't hide them with orDie).

---

## Example
**Before:**
```typescript
export const getUserHandler = (request: NextRequest) =>
  Effect.gen(function* () {
    const body = yield* Effect.tryPromise(() => request.json());
    const user = yield* getUserFromDB(body.id).pipe(
      Effect.orDie  // ❌ "If user not found, crash the system"
    );
    return NextResponse.json(user);
  });

// If user not found: request crashes, returns 500, logs unhandled exception
```

**After:**
```typescript
export class UserNotFound {
  readonly _tag = "UserNotFound";
  constructor(readonly userId: string) {}
}

export const getUserHandler = (request: NextRequest) =>
  Effect.gen(function* () {
    const body = yield* Effect.tryPromise(() => request.json());
    const result = yield* getUserFromDB(body.id);  // Effect<User, UserNotFound>

    return result.pipe(
      Effect.match(
        {
          onSuccess: (user) => NextResponse.json(user),
          onFailure: (error) =>
            error._tag === "UserNotFound"
              ? NextResponse.json({ error: "User not found" }, { status: 404 })
              : NextResponse.json({ error: "Server error" }, { status: 500 }),
        }
      )
    );
  });

// Now: user not found = 404 response, handled gracefully, logged as expected
```

---

## Related patterns
See also:
- **catching-errors-too-early** — orDie is the opposite mistake (handling too late)
- **missing-error-channel** — orDie hides error types from callers
