# Pattern Guidance: Log or handle errors in catchAll, don't swallow them

**Goal: All errors are observable and actionable.**

## Use when
- You have an error handler that cannot recover (e.g., cleanup or logging).
- You need a fallback when you don't know the specific error type.
- You're at a boundary where you must produce a response, even on error.

## Avoid when
- Using `catchAll` to silently ignore errors.
- Catching errors and returning `null` or `undefined` instead of handling them.
- Swallowing errors with `Effect.ignore`.
- Catching without logging—no one will know the error happened.

## Decision rule
If you're catching an error:
- **Log it** (at minimum): `Effect.logError`, structured logging, or telemetry.
- **Handle it**: map to a meaningful response, retry, or fail explicitly.
- **Never silently ignore** it.

**Simplifier**
Silent catchAll = "Error happened, no one knows."
catchAll + log = "Error happened, tracked, can alert."

## Goal
All errors are observable and actionable.

---

## Architecture impact
**Domain impact**
- Silent failures: operations fail but code continues as if successful.
- Data corruption: database operation failed, but caller thinks it succeeded.
- Lost information: errors are caught and forgotten, no audit trail.

**Boundary/runtime impact**
- Observability: error rate metrics are completely wrong (errors disappear).
- Debugging: impossible to trace why something isn't working.
- Alerting: errors don't trigger alerts because no one logs them.
- Production mysteries: "Why is user data missing?" → buried in a silent catchAll.

---

## Implementation prompt
"Implement the Fix Plan for this finding: Add logging to the catchAll block. Use `Effect.logError` or structured logging. If you're converting to a response, log the error before returning. Test: verify errors appear in logs/tracing."

---

## Fix Plan (Steps + Diff summary + Risks)
**Steps**
1. Identify the `catchAll` that swallows errors.
2. Add logging: `yield* Effect.logError(error)`.
3. If handling the error (returning success): log with context ("Payment failed, returning 500").
4. If retrying: log the attempt ("Retry attempt 1 of 3").
5. Test: run operations that fail and verify error appears in logs.

**What will change (summary)**
- Errors are logged with context.
- Failures are observable in logs/tracing.
- Debugging becomes possible.
- Alerts can be configured on error patterns.

**Risks / watch-outs**
- Logging too much creates noise (too many logs = alerts muted).
- Logging sensitive data: filter PII before logging.
- Performance: avoid logging in hot loops without sampling.

---

## Example
**Before:**
```typescript
export const saveUserProfile = (userId: string, profile: Profile): Effect<void, never> =>
  Effect.gen(function* () {
    yield* db.save(userId, profile).pipe(
      Effect.catchAll(() => {
        // ❌ Error swallowed silently
        return Effect.void;
      })
    );
  });

// If database fails: user sees success, data isn't saved, no one knows
```

**After:**
```typescript
export const saveUserProfile = (userId: string, profile: Profile): Effect<void, Error> =>
  Effect.gen(function* () {
    yield* db.save(userId, profile).pipe(
      Effect.catchAll((error) => {
        // Log with context
        yield* Effect.logError(`Failed to save profile for user ${userId}: ${error}`);
        // Re-throw so caller knows it failed
        return Effect.fail(error);
      })
    );
  });

// Or if you're at a boundary and must respond:
export async function POST(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  const profile = await request.json();

  const result = await Effect.runPromise(
    saveUserProfile(userId, profile).pipe(
      Effect.catchAll((error) => {
        // Log the error before returning response
        Effect.logError(`POST /profile failed: ${error}`);
        return Effect.void;
      })
    )
  );

  return NextResponse.json({ ok: true });  // User gets response, error is logged
}
```

---

## Related patterns
See also:
- **catching-errors-too-early** — swallowing errors is the opposite problem
- **logging-discipline** — proper logging structure and context
- **missing-error-channel** — errors not tracked lead to silent failures
