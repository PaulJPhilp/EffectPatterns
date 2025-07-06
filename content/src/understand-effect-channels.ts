import { Effect, Data } from "effect";

// Define the types for our channels
interface User { readonly name: string; } // The 'A' type
class UserNotFoundError extends Data.TaggedError("UserNotFoundError") {} // The 'E' type

// Define the Database service using Effect.Service
export class Database extends Effect.Service<Database>()(
  "Database",
  {
    // Provide a default implementation
    sync: () => ({
      findUser: (id: number) =>
        id === 1
          ? Effect.succeed({ name: "Paul" })
          : Effect.fail(new UserNotFoundError())
    })
  }
) {}

// This function's signature shows all three channels
const getUser = (id: number): Effect.Effect<User, UserNotFoundError, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    return yield* db.findUser(id);
  });

// The program will use the default implementation
const program = getUser(1);

// Run the program with the default implementation
Effect.runPromise(
  Effect.provide(
    program,
    Database.Default
  )
).then(console.log); // { name: 'Paul' }