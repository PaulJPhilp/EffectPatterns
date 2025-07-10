import { Effect, Layer, Console } from "effect";

interface DbOps {
  query: (sql: string) => Effect.Effect<string[], never, never>;
}

// 1. Define the service using Effect.Service
class Database extends Effect.Service<DbOps>()(
  "Database",
  {
    effect: Effect.gen(function* () {
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