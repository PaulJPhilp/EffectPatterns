import { Effect, Console } from "effect";

// A mock resource that needs to be managed
const getDbConnection = Effect.sync(() => ({ id: Math.random() })).pipe(
  Effect.tap(() => Console.log("Connection Acquired")),
);

const closeDbConnection = (conn: { id: number }): Effect.Effect<void, never, never> =>
  Effect.sync(() => console.log(`Connection ${conn.id} Released`));

// The program that uses the resource
const program = Effect.acquireRelease(
  getDbConnection, // 1. acquire
  (connection) => closeDbConnection(connection) // 2. cleanup
).pipe(
  Effect.tap((connection) =>
    Console.log(`Using connection ${connection.id} to run query...`)
  )
);

Effect.runPromise(Effect.scoped(program));

/*
Output:
Connection Acquired
Using connection 0.12345... to run query...
Connection 0.12345... Released
*/