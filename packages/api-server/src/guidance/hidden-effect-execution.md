# Pattern Guidance: Never run Effects at module scope

## Finding
**Testing Anti-Pattern:** Effects are executed at module import time instead of inside your program.

## What this means (plain language)
When you run an Effect at module scope (outside a function), it executes the moment the module loads—before any test setup, before dependency injection, before your program has a chance to control it. This breaks testing (tests can't mock dependencies), causes side effects on import (database queries, API calls), and hides what the program actually does. The rule is simple: Effects describe work; only your `main` function or test harness should execute them.

---

## Use when
Run Effects only when:
- inside a function body (defers execution to call time)
- inside `Effect.gen` or `Effect.flatMap` (composes other Effects)
- at the very end of `main` or a test harness (the boundary that executes the program)

---

## Avoid when
Avoid running Effects at module scope when:
- initializing module-level variables (looks clean but executes on import)
- defining middleware or handlers without wrapping in functions
- using top-level `await` (JavaScript, not TypeScript—but same problem)
- creating services without lazily deferring their setup

---

## Decision rule
Ask: "Does this code run the moment the module is imported?"
- If yes and it makes an Effect: wrap it in a function or defer with Layer
- If you're not sure: move it into `main` or a function; verify the Effect is lazy

**Simplifier**
Module scope = code runs on import. Effects describe work; never run them until the boundary.

---

## Goal
Keep effects lazy, testable, and under program control.

---

## Architecture impact
**Domain impact**
- Tests can't control execution (dependency mocks don't work if Effect runs at import).
- Hidden side effects: importing a module might make API calls (developers miss this).
- Debugging is hard: you see side effects but can't trace them to a clear execution point.
- Refactoring breaks tests: moving code triggers different side effects.

**Boundary/runtime impact**
- Application startup becomes a mystery: you don't know what runs before `main`.
- Error handling breaks: if a side effect fails at import, it's hard to recover.
- Dependency injection doesn't work: can't provide test versions of services.
- Observability fails: no clear fiber context or tracing for module-scope work.

---

## Implementation prompt
"Implement the Fix Plan for this finding: move the Effect execution out of module scope. Wrap in a function, use Layer for lazy initialization, or defer to main/test boundary. Verify the module loads without side effects."

---

## Fix Plan (Steps + Diff summary + Risks)
**Steps**
1. Identify all top-level code that calls Effect.runPromise, Effect.runSync, etc.
2. For each, move the code into a function (lazy execution).
3. If it's a service or initialization: use Layer (defers setup until needed).
4. Move execution to `main` or a test harness (the boundary).
5. Test: importing the module should not trigger side effects.

**What will change (summary)**
- Module imports become side-effect-free (safe to import in tests).
- Execution is explicit and under program control (clear entry point).
- Dependencies can be mocked in tests (Effect.provide works as intended).

**Risks / watch-outs**
- Lazy execution delays errors (module loads fine, but main fails).
- If many modules execute at scope, refactoring takes time (migrate incrementally).
- Some frameworks (e.g., NextJS, tRPC) have conventions that look like module scope; respect them but ensure testability.

---

## Example
**Before:**
```typescript
// database.ts
import { Effect } from "effect";

// ❌ Runs the moment the module is imported!
const dbConn = Effect.runSync(
  Effect.promise(() => connectToDatabase())
);

export { dbConn };

// service.ts
import { dbConn } from "./database";

export const getUserService = (userId: string) =>
  Effect.promise(() => dbConn.query(`SELECT * FROM users WHERE id = ?`, [userId]));

// Importing service.ts triggers the database connection.
// Tests that import service.ts must connect to real database.
// Mocking doesn't work because the Effect already ran.
```

**After:**
```typescript
// database.ts
import { Effect, Layer } from "effect";

export interface Database {
  query: (sql: string, params: readonly unknown[]) => Effect.Effect<unknown, Error>;
}

// Lazy initialization: defers database connection until needed
export const DatabaseLive = Layer.scoped(Database)(
  Effect.gen(function* () {
    const conn = yield* Effect.promise(() => connectToDatabase());
    return {
      query: (sql: string, params: readonly unknown[]) =>
        Effect.promise(() => conn.query(sql, params)),
    };
  })
);

// service.ts
import { Effect } from "effect";
import type { Database } from "./database";

export const getUserService = (userId: string): Effect.Effect<User, Error, Database> =>
  Effect.gen(function* () {
    const db = yield* Effect.service(Database);
    return yield* db.query(`SELECT * FROM users WHERE id = ?`, [userId]);
  });

// main.ts - the boundary that executes the program
Effect.gen(function* () {
  const user = yield* getUserService("123");
  console.log(user);
})
  .pipe(
    Effect.provide(DatabaseLive),
    Effect.runPromise
  )
  .catch(console.error);

// test.ts - can provide a mock database
const MockDatabase = Layer.succeed(Database)({
  query: () => Effect.succeed({ id: "123", name: "Test User" }),
});

Effect.gen(function* () {
  const user = yield* getUserService("123");
  expect(user.name).toBe("Test User");
})
  .pipe(
    Effect.provide(MockDatabase),
    Effect.runSync
  );

// Now: importing service.ts has no side effects; tests control execution.
```

---

## Related patterns
See also:
- **leaking-scopes** — if Effects run at module scope, cleanup is not supervised
- **logging-discipline** — module-scope logging can leak secrets before your observability layer is ready
