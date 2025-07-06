import { Schema, Effect } from "effect";

// Define User schema and type
const UserSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String
});

type User = Schema.Schema.Type<typeof UserSchema>;

// Define error type
class UserNotFound extends Error {
  readonly _tag = 'UserNotFound';
  constructor(id: number) {
    super(`User with id ${id} not found`);
  }
}

// Define database service interface
interface DatabaseService {
  readonly getUser: (id: number) => Effect.Effect<User, UserNotFound>;
}

// Create database service implementation
export class Database extends Effect.Service<Database>()(
  "Database",
  {
    sync: () => ({
      getUser: (id: number) =>
        id === 1
          ? Effect.succeed({ id: 1, name: "John" })
          : Effect.fail(new UserNotFound(id))
    })
  }
) {}

// Example usage
const program = Effect.gen(function* () {
  const db = yield* Database;
  
  // Try to get an existing user
  const user1 = yield* db.getUser(1);
  console.log('Found user:', user1);
  
  // Try to get a non-existent user
  const user2 = yield* db.getUser(999);
  return user2;
});

// Run with error handling
Effect.runPromise(
  Effect.provide(
    program,
    Database.Default
  )
).then(
  (user) => console.log('Success:', user),
  (error) => console.error('Error:', error.message)
);