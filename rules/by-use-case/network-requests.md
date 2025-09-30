# Network Requests Patterns

## Safely Bracket Resource Usage with `acquireRelease`

Bracket the use of a resource between an `acquire` and a `release` effect.

### Example

```typescript
import { Effect, Console } from "effect";

// A mock resource that needs to be managed
const getDbConnection = Effect.sync(() => ({ id: Math.random() })).pipe(
  Effect.tap(() => Effect.log("Connection Acquired")),
);

const closeDbConnection = (conn: { id: number }): Effect.Effect<void, never, never> =>
  Effect.log(`Connection ${conn.id} Released`);

// The program that uses the resource
const program = Effect.acquireRelease(
  getDbConnection, // 1. acquire
  (connection) => closeDbConnection(connection) // 2. cleanup
).pipe(
  Effect.tap((connection) =>
    Effect.log(`Using connection ${connection.id} to run query...`)
  )
);

Effect.runPromise(Effect.scoped(program));

/*
Output:
Connection Acquired
Using connection 0.12345... to run query...
Connection 0.12345... Released
*/
```

**Explanation:**
By using `Effect.acquireRelease`, the `closeDbConnection` logic is guaranteed to run after the main logic completes. This creates a self-contained, leak-proof unit of work that can be safely composed into larger programs.

---

