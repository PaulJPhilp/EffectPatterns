import { Effect } from "effect";

// Define the user interface
export interface User {
  readonly id: string;
  readonly name: string;
}

// Define service interface
interface UserOps {
  readonly getUser: (id: string) => Effect.Effect<User>
}

// Define the service using Effect.Service pattern
export class UserService extends Effect.Service<UserService>()(
  "UserService",
  {
    sync: () => ({
      getUser: (id: string) =>
        Effect.gen(function* () {
          yield* Effect.logInfo(`Fetching user with id: ${id}`)
          // Simulate fetching user from database
          const user: User = {
            id,
            name: `User ${id}`
          }
          yield* Effect.logInfo(`Found user: ${JSON.stringify(user)}`)
          return user
        })
    })
  }
) {}

// Example usage
const program = Effect.gen(function* () {
  const userService = yield* UserService
  yield* Effect.logInfo("=== Fetching users ===")
  
  const user1 = yield* userService.getUser("123")
  yield* Effect.logInfo(`Got user 1: ${JSON.stringify(user1)}`)
  
  const user2 = yield* userService.getUser("456")
  yield* Effect.logInfo(`Got user 2: ${JSON.stringify(user2)}`)
})

Effect.runPromise(
  Effect.provide(program, UserService.Default)
)
