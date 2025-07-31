import { Effect, Console } from "effect";

// 1. Define the service interface
interface DatabaseService {
  readonly query: (sql: string) => Effect.Effect<string[], never, never>
}

// 2. Define the service implementation with scoped resource management
class Database extends Effect.Service<DatabaseService>()(
  "Database",
  {
    // The scoped property manages the resource lifecycle
    scoped: Effect.gen(function* () {
      const id = Math.floor(Math.random() * 1000);
      
      // Acquire the connection
      yield* Effect.log(`[Pool ${id}] Acquired`);
      
      // Setup cleanup to run when scope closes
      yield* Effect.addFinalizer(() => Effect.log(`[Pool ${id}] Released`));
      
      // Return the service implementation
      return {
        query: (sql: string) => Effect.sync(() => 
          [`Result for '${sql}' from pool ${id}`]
        )
      };
    })
  }
) {}

// 3. Use the service in your program
const program = Effect.gen(function* () {
  const db = yield* Database;
  const users = yield* db.query("SELECT * FROM users");
  yield* Effect.log(`Query successful: ${users[0]}`);
});

// 4. Run the program with scoped resource management
Effect.runPromise(
  Effect.scoped(program).pipe(
    Effect.provide(Database.Default)
  )
);

/*
Output:
[Pool 458] Acquired
Query successful: Result for 'SELECT * FROM users' from pool 458
[Pool 458] Released
*/