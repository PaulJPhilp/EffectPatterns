# resource-management Patterns

## Compose Resource Lifecycles with `Layer.merge`

Compose multiple scoped layers using `Layer.merge` or by providing one layer to another.

### Example

```typescript
import { Effect, Layer, Console } from "effect";

// --- Service 1: Database ---
interface DatabaseOps {
  query: (sql: string) => Effect.Effect<string, never, never>;
}

class Database extends Effect.Service<DatabaseOps>()("Database", {
  sync: () => ({
    query: (sql: string): Effect.Effect<string, never, never> =>
      Effect.sync(() => `db says: ${sql}`),
  }),
}) {}

// --- Service 2: API Client ---
interface ApiClientOps {
  fetch: (path: string) => Effect.Effect<string, never, never>;
}

class ApiClient extends Effect.Service<ApiClientOps>()("ApiClient", {
  sync: () => ({
    fetch: (path: string): Effect.Effect<string, never, never> =>
      Effect.sync(() => `api says: ${path}`),
  }),
}) {}

// --- Application Layer ---
// We merge the two independent layers into one.
const AppLayer = Layer.merge(Database.Default, ApiClient.Default);

// This program uses both services, unaware of their implementation details.
const program = Effect.gen(function* () {
  const db = yield* Database;
  const api = yield* ApiClient;

  const dbResult = yield* db.query("SELECT *");
  const apiResult = yield* api.fetch("/users");

  yield* Effect.log(dbResult);
  yield* Effect.log(apiResult);
});

// Provide the combined layer to the program.
Effect.runPromise(Effect.provide(program, AppLayer));

/*
Output (note the LIFO release order):
Database pool opened
API client session started
db says: SELECT *
api says: /users
API client session ended
Database pool closed
*/
```

**Explanation:**
We define two completely independent services, `Database` and `ApiClient`, each with its own resource lifecycle. By combining them with `Layer.merge`, we create a single `AppLayer`. When `program` runs, Effect acquires the resources for both layers. When `program` finishes, Effect closes the application's scope, releasing the resources in the reverse order they were acquired (`ApiClient` then `Database`), ensuring a clean and predictable shutdown.

---

## Create a Managed Runtime for Scoped Resources

Create a managed runtime for scoped resources.

### Example

```typescript
import { Effect, Layer } from "effect";

class DatabasePool extends Effect.Service<DatabasePool>()("DbPool", {
  effect: Effect.gen(function* () {
    yield* Effect.log("Acquiring pool");
    return {
      query: () => Effect.succeed("result"),
    };
  }),
}) {}

// Create a program that uses the DatabasePool service
const program = Effect.gen(function* () {
  const db = yield* DatabasePool;
  yield* Effect.log("Using DB");
  yield* db.query();
});

// Run the program with the service implementation
Effect.runPromise(
  program.pipe(Effect.provide(DatabasePool.Default), Effect.scoped)
);
```

**Explanation:**  
`Layer.launch` ensures that resources are acquired and released safely, even
in the event of errors or interruptions.

---

## Create a Service Layer from a Managed Resource

Provide a managed resource to the application context using `Layer.scoped`.

### Example

```typescript
import { Effect, Console } from "effect";

// 1. Define the service interface
interface DatabaseService {
  readonly query: (sql: string) => Effect.Effect<string[], never, never>;
}

// 2. Define the service implementation with scoped resource management
class Database extends Effect.Service<DatabaseService>()("Database", {
  // The scoped property manages the resource lifecycle
  scoped: Effect.gen(function* () {
    const id = Math.floor(Math.random() * 1000);

    // Acquire the connection
    yield* Effect.log(`[Pool ${id}] Acquired`);

    // Setup cleanup to run when scope closes
    yield* Effect.addFinalizer(() => Effect.log(`[Pool ${id}] Released`));

    // Return the service implementation
    return {
      query: (sql: string) =>
        Effect.sync(() => [`Result for '${sql}' from pool ${id}`]),
    };
  }),
}) {}

// 3. Use the service in your program
const program = Effect.gen(function* () {
  const db = yield* Database;
  const users = yield* db.query("SELECT * FROM users");
  yield* Effect.log(`Query successful: ${users[0]}`);
});

// 4. Run the program with scoped resource management
Effect.runPromise(
  Effect.scoped(program).pipe(Effect.provide(Database.Default))
);

/*
Output:
[Pool 458] Acquired
Query successful: Result for 'SELECT * FROM users' from pool 458
[Pool 458] Released
*/
```

**Explanation:**
The `Effect.Service` helper creates the `Database` class, which acts as both the service definition and its context key (Tag). The `Database.Live` layer connects this service to a concrete, lifecycle-managed implementation. When `program` asks for the `Database` service, the Effect runtime uses the `Live` layer to run the `acquire` effect once, caches the resulting `DbPool`, and injects it. The `release` effect is automatically run when the program completes.

---

## Creating from Collections

Use fromIterable and fromArray to lift collections into Streams or Effects for batch or streaming processing.

### Example

```typescript
import { Stream, Effect } from "effect";

// Stream: Create a stream from an array
const numbers = [1, 2, 3, 4];
const numberStream = Stream.fromIterable(numbers); // Stream<number>

// Stream: Create a stream from any iterable
function* gen() {
  yield "a";
  yield "b";
}
const letterStream = Stream.fromIterable(gen()); // Stream<string>

// Effect: Create an effect from an array of effects (batch)
const effects = [Effect.succeed(1), Effect.succeed(2)];
const batchEffect = Effect.all(effects); // Effect<[1, 2]>
```

**Explanation:**

- `Stream.fromIterable` creates a stream from any array or iterable, enabling streaming and batch operations.
- `Effect.all` (covered elsewhere) can be used to process arrays of effects in batch.

---

## Manually Manage Lifecycles with `Scope`

Use `Effect.scope` and `Scope.addFinalizer` for fine-grained control over resource cleanup.

### Example

```typescript
import { Effect, Console } from "effect";

// Mocking a complex file operation
const openFile = (path: string) =>
  Effect.succeed({ path, handle: Math.random() }).pipe(
    Effect.tap((f) => Effect.log(`Opened ${f.path}`))
  );
const createTempFile = (path: string) =>
  Effect.succeed({ path: `${path}.tmp`, handle: Math.random() }).pipe(
    Effect.tap((f) => Effect.log(`Created temp file ${f.path}`))
  );
const closeFile = (file: { path: string }) =>
  Effect.sync(() => Effect.log(`Closed ${file.path}`));
const deleteFile = (file: { path: string }) =>
  Effect.sync(() => Effect.log(`Deleted ${file.path}`));

// This program acquires two resources (a file and a temp file)
// and ensures both are cleaned up correctly using acquireRelease.
const program = Effect.gen(function* () {
  const file = yield* Effect.acquireRelease(openFile("data.csv"), (f) =>
    closeFile(f)
  );

  const tempFile = yield* Effect.acquireRelease(
    createTempFile("data.csv"),
    (f) => deleteFile(f)
  );

  yield* Effect.log("...writing data from temp file to main file...");
});

// Run the program with a scope
Effect.runPromise(Effect.scoped(program));

/*
Output (note the LIFO cleanup order):
Opened data.csv
Created temp file data.csv.tmp
...writing data from temp file to main file...
Deleted data.csv.tmp
Closed data.csv
*/
```

**Explanation:**
`Effect.scope` creates a new `Scope` and provides it to the `program`. Inside `program`, we access this `Scope` and use `addFinalizer` to register cleanup actions immediately after acquiring each resource. When `Effect.scope` finishes executing `program`, it closes the scope, which in turn executes all registered finalizers in the reverse order of their addition.

---

## Safely Bracket Resource Usage with `acquireRelease`

Bracket the use of a resource between an `acquire` and a `release` effect.

### Example

```typescript
import { Effect, Console } from "effect";

// A mock resource that needs to be managed
const getDbConnection = Effect.sync(() => ({ id: Math.random() })).pipe(
  Effect.tap(() => Effect.log("Connection Acquired"))
);

const closeDbConnection = (conn: {
  id: number;
}): Effect.Effect<void, never, never> =>
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
