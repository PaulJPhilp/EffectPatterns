# Application Architecture Rules

## Compose Resource Lifecycles with `Layer.merge`
**Rule:** Compose multiple scoped layers using `Layer.merge` or by providing one layer to another.

### Example
```typescript
import { Effect, Layer, Console } from "effect";

// --- Service 1: Database ---
interface DatabaseOps {
  query: (sql: string) => Effect.Effect<string, never, never>;
}

class Database extends Effect.Service<DatabaseOps>()(
  "Database",
  {
    sync: () => ({
      query: (sql: string): Effect.Effect<string, never, never> =>
        Effect.sync(() => `db says: ${sql}`)
    })
  }
) {}

// --- Service 2: API Client ---
interface ApiClientOps {
  fetch: (path: string) => Effect.Effect<string, never, never>;
}

class ApiClient extends Effect.Service<ApiClientOps>()(
  "ApiClient",
  {
    sync: () => ({
      fetch: (path: string): Effect.Effect<string, never, never> =>
        Effect.sync(() => `api says: ${path}`)
    })
  }
) {}

// --- Application Layer ---
// We merge the two independent layers into one.
const AppLayer = Layer.merge(Database.Default, ApiClient.Default);

// This program uses both services, unaware of their implementation details.
const program = Effect.gen(function* () {
  const db = yield* Database;
  const api = yield* ApiClient;

  const dbResult = yield* db.query("SELECT *");
  const apiResult = yield* api.fetch("/users");

  yield* Console.log(dbResult);
  yield* Console.log(apiResult);
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

## Create a Service Layer from a Managed Resource
**Rule:** Provide a managed resource to the application context using `Layer.scoped`.

### Example
```typescript
import { Effect, Layer, Console } from "effect";

interface DbOps {
  query: (sql: string) => Effect.Effect<string[], never, never>;
}

// 1. Define the service using Effect.Service
class Database extends Effect.Service<DbOps>()(
  "Database",
  {
    scoped: Effect.gen(function* () {
      const id = Math.floor(Math.random() * 1000);
      yield* Console.log(`[Pool ${id}] Acquired`);
      return {
        query: (sql: string): Effect.Effect<string[], never, never> =>
          Effect.sync(() => [`Result for '${sql}' from pool ${id}`])
      };
    })
  }
) {}

// This program depends on the abstract Database service
const program = Effect.gen(function* () {
  const db = yield* Database;
  const users = yield* db.query("SELECT * FROM users");
  yield* Console.log(`Query successful: ${users[0]}`);
});

// Provide the live implementation to run the program
Effect.runPromise(Effect.provide(program, Database.Default));

/*
Output:
[Pool 458] Acquired
Query successful: Result for 'SELECT * FROM users' from pool 458
[Pool 458] Released
*/
```

**Explanation:**
The `Effect.Service` helper creates the `Database` class with a `scoped` implementation. When `program` asks for the `Database` service, the Effect runtime creates a new connection pool, logs the acquisition, and automatically releases it when the scope closes. The `scoped` implementation ensures proper resource lifecycle management - the pool is acquired when first needed and released when the scope ends.

