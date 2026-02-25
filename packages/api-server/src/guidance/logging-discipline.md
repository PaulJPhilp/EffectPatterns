# Pattern Guidance: Use structured logging with secret masking

## Finding
**Observability Anti-Pattern:** Mixing debug console.log, ad-hoc string formatting, and structured logs; leaking secrets or correlation IDs; no way to filter or alert.

## What this means (plain language)
When you `console.log("user:", user)`, you might print passwords, API keys, or tokens to the terminal and logs. When you don't correlate logs with request IDs, you can't trace a bug across services. When you mix `console.log` (unstructured) and structured JSON logs, tools can't parse or alert on them. Effect's Logger service + metadata makes this clean—but you must use it deliberately.

---

## Use when
Use structured logging when:
- in production code (always use a Logger service, not console.log)
- logging business events (user login, payment, error) that ops needs to observe
- logging errors that must be traced (include error type, not just message)
- logging performance metrics or resource usage

Use debug logging only when:
- you're developing locally (throwaway code that won't ship)
- you need temporary visibility into internal state (remove before commit)

---

## Avoid when
Avoid console.log when:
- logging user input or API responses (use structured log with schema validation)
- logging errors without context (error type, severity, correlation ID)
- mixing debug and production logs (makes observability noisy)
- not masking sensitive fields (passwords, tokens, PII)

---

## Decision rule
For each log statement, ask:
- "Is this going to production?" → Use a Logger service, not console.log
- "Does this contain secrets?" → Use redaction/schema (never raw user input)
- "Can this be filtered/alerted?" → Use structured fields, not prose

**Simplifier**
Console.log = developer sandbox. Logger service = production observability. Never mix.

---

## Goal
Keep work supervised, bounded, and observable without leaking secrets.

---

## Architecture impact
**Domain impact**
- Secrets in logs: leaked API keys, tokens, passwords from unfiltered user data.
- Missing correlation: can't trace a request across services (no request ID or user ID in logs).
- Noisy observability: debug logs mixed with production logs; alerts trigger on garbage.

**Boundary/runtime impact**
- Log aggregation breaks: structured logs parsed as JSON, ad-hoc logs fail parsing.
- Debugging becomes impossible: can't filter by user, request ID, or service.
- Compliance violations: logs containing PII or secrets can trigger audit failures.
- On-call becomes painful: alerts on debug logs instead of real issues.

---

## Implementation prompt
"Implement the Fix Plan for this finding: replace console.log with a Logger service. Define a schema for logged events (include correlation ID, severity, redacted fields). Update call sites to use structured logging."

---

## Fix Plan (Steps + Diff summary + Risks)
**Steps**
1. Choose a Logger (Effect.Logger, winston, pino, etc.); ensure it integrates with Effect's context.
2. Define a schema for each event type (login, payment, error) with field names and redaction rules.
3. Replace console.log with logger.info/debug/error.
4. Add correlation context (request ID, user ID) to logs.
5. Test: verify logs are valid JSON (or chosen format) and don't contain secrets.

**What will change (summary)**
- Logs are structured and filterable (can query by field).
- Secrets are redacted (passwords, tokens, keys never appear).
- Correlation is explicit (request ID, user ID in every log).

**Risks / watch-outs**
- Logs become verbose (more fields = more output; use log levels to filter).
- Schema changes require migrations (old logs don't match new schema).
- Over-logging impacts performance (batch writes, use sampling for high-volume logs).
- Team discipline: if devs keep using console.log, structure is lost (code review + lint rules help).

---

## Example
**Before:**
```typescript
import { Effect } from "effect";

export const loginUser = (username: string, password: string): Effect<User, Error> =>
  Effect.gen(function* () {
    console.log("Login attempt:", username, password);  // ❌ Logs password in plaintext!

    const user = yield* Effect.promise(() =>
      fetch("/api/users", { method: "POST", body: JSON.stringify({ username, password }) })
    );

    console.log("User logged in:", user);  // ❌ Unstructured; can't filter or alert

    return user;
  });

// Result: password in logs, can't trace by user ID, no request correlation
```

**After:**
```typescript
import { Effect, Context, Logger } from "effect";

// Define a schema for login events
interface LoginEvent {
  _tag: "LoginAttempt" | "LoginSuccess" | "LoginFailure";
  username: string;  // Safe to log (public identifier)
  requestId: string;  // For correlation
  severity: "info" | "warn" | "error";
  timestamp: Date;
  errorMessage?: string;  // Safe error; never include password
}

const RequestId = Context.Tag<{ id: string }>("RequestId");

export const loginUser = (username: string, password: string): Effect.Effect<User, Error> =>
  Effect.gen(function* () {
    const logger = yield* Logger;
    const { id: requestId } = yield* RequestId;

    yield* logger.info("LoginAttempt", {
      username,
      requestId,
      timestamp: new Date(),
    });

    const user = yield* Effect.promise(() =>
      fetch("/api/users", {
        method: "POST",
        body: JSON.stringify({ username, password }),  // password never logged
      })
    ).pipe(
      Effect.catchAll((error) => {
        logger.error("LoginFailure", {
          username,
          requestId,
          errorMessage: error.message,  // Message safe; never raw error with password
          timestamp: new Date(),
        });
        return Effect.fail(error);
      })
    );

    yield* logger.info("LoginSuccess", {
      username,
      requestId,
      timestamp: new Date(),
    });

    return user;
  });

// Usage: provide RequestId and Logger
Effect.gen(function* () {
  const user = yield* loginUser("alice", "secret-password");
  return user;
})
  .pipe(
    Effect.provide(
      Effect.Context.Empty.pipe(
        Context.add(RequestId, { id: crypto.randomUUID() })
      )
    ),
    // Logger can be swapped: console for dev, structured JSON for prod
    Effect.provideLayer(Logger.pretty),  // Dev: colorized
    // Effect.provideLayer(Logger.json),  // Prod: JSON for aggregation
    Effect.runPromise
  );

// Logs (dev):
// [INFO] LoginAttempt { username: "alice", requestId: "uuid-123", timestamp: "2026-01-16T..." }
// [INFO] LoginSuccess { username: "alice", requestId: "uuid-123", timestamp: "2026-01-16T..." }

// Logs (prod):
// {"level":"info","message":"LoginAttempt","username":"alice","requestId":"uuid-123",...}
// {"level":"info","message":"LoginSuccess","username":"alice","requestId":"uuid-123",...}

// Now: can filter by username, requestId, or severity; no secrets leaked
```

---

## Related patterns
See also:
- **hidden-effect-execution** — logging at module scope can leak secrets before your logger is ready
- **missing-error-channel** — structure error logs so they're filterable and correlated
