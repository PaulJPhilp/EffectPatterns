# Pattern Guidance: Use Effect.Layer for global resources instead of singletons

**Goal: Enable testability, dependency injection, and composition.**

## Use when
- You have a shared resource (database, cache, logger, HTTP client) that multiple parts of your app need.
- You want to mock or swap the implementation in tests.
- You're composing a large application with multiple services.

## Avoid when
- You create a global singleton `export const db = new Database()`.
- You call the singleton at module scope (runs on import).
- You initialize resources outside of your Effect program.
- Tests can't inject a fake version because the real one is hardwired.

## Decision rule
If a resource is shared across multiple handlers/services:
- Define it as an `Effect.Service`.
- Provide it via a `Layer` (which constructs it when needed).
- Never export a raw singleton instance.

**Simplifier**
Singleton = "Fixed in place, can't swap."
Layer = "Provided at runtime, testable."

## Goal
Enable testability, dependency injection, and composition.

---

## Architecture impact
**Domain impact**
- Tests are tied to real resources (database, API).
- Can't test in isolation or with mocks.
- Initialization order is implicit and fragile.

**Boundary/runtime impact**
- Deployment is rigid: can't use different configs per environment without code changes.
- Debugging is hard: which code is calling the singleton?
- Concurrency: shared singleton state may have race conditions.
- Resource cleanup: no guaranteed cleanup; resources persist until process exit.

---

## Implementation prompt
"Implement the Fix Plan for this finding: Convert the singleton to an `Effect.Service` with a `Layer` provider. Update call sites to use `Effect.service(MyService)` instead of the global reference. Provide a test layer in tests."

---

## Fix Plan (Steps + Diff summary + Risks)
**Steps**
1. Extract the singleton into an `Effect.Service` type.
2. Create a `Layer` that constructs the service (lazy initialization).
3. Replace all references to the global singleton with `yield* Effect.service(MyService)`.
4. At the application boundary (main), provide the production layer with `Effect.provide(Layer)`.
5. In tests, provide a mock layer instead.

**What will change (summary)**
- Resources are created on-demand when the layer is provided.
- Each test can inject a different implementation.
- Application bootstrap is explicit: all layers are visible at the entry point.

**Risks / watch-outs**
- Layer initialization is lazy: the service isn't created until first use.
- Circular dependencies between layers: ensure layers form a DAG (no cycles).
- Tests need to provide all layers: can be verbose if many dependencies.

---

## Example
**Before:**
```typescript
// database.ts - Global singleton
export const db = new DatabaseClient({
  url: process.env.DATABASE_URL,
  pool: { max: 10 },
});

// service.ts
import { db } from "./database";

export const getUserService = (userId: string) =>
  Effect.promise(() => db.query(`SELECT * FROM users WHERE id = ?`, [userId]));

// test.ts - Can't mock the database!
describe("getUserService", () => {
  it("returns user", async () => {
    const result = await Effect.runPromise(getUserService("123"));
    // ^^ This hits the REAL database!
  });
});
```

**After:**
```typescript
// database.ts - Service + Layer
import { Effect, Layer } from "effect";

export interface Database {
  query(sql: string, params: readonly unknown[]): Effect.Effect<unknown, Error>;
}

export const Database = Effect.Service<Database>();

export const DatabaseLive = Layer.scoped(Database)(
  Effect.gen(function* () {
    const client = new DatabaseClient({
      url: process.env.DATABASE_URL,
      pool: { max: 10 },
    });
    yield* Effect.addFinalizer(() =>
      Effect.promise(() => client.close())
    );
    return {
      query: (sql, params) =>
        Effect.promise(() => client.query(sql, params)),
    };
  })
);

export const DatabaseMock = Layer.succeed(Database)({
  query: () => Effect.succeed({ id: "123", name: "Test User" }),
});

// service.ts
export const getUserService = (userId: string): Effect.Effect<User, Error, Database> =>
  Effect.gen(function* () {
    const db = yield* Effect.service(Database);
    return yield* db.query(`SELECT * FROM users WHERE id = ?`, [userId]);
  });

// test.ts - Can inject mock!
describe("getUserService", () => {
  it("returns user", async () => {
    const result = await Effect.runPromise(
      getUserService("123").pipe(
        Effect.provide(DatabaseMock)
      )
    );
    // ^^ Uses the MOCK database!
  });
});

// main.ts - Explicitly provide layers
Effect.gen(function* () {
  const user = yield* getUserService("123");
  console.log(user);
}).pipe(
  Effect.provide(DatabaseLive),
  Effect.runPromise
);
```

---

## Related patterns
See also:
- **layer-dependency-cycle** — circular dependencies between layers break initialization
- **hidden-effect-execution** — singletons constructed at module scope have similar problems
