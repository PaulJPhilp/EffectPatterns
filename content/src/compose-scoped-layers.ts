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