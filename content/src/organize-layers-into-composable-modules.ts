// src/core/Logger.ts
import { Effect } from "effect";

export class Logger extends Effect.Service<Logger>()(
  "App/Core/Logger",
  {
    sync: () => ({
      log: (msg: string) => Effect.sync(() => console.log(`[LOG] ${msg}`))
    })
  }
) {}

// src/features/User/UserRepository.ts
export class UserRepository extends Effect.Service<UserRepository>()(
  "App/User/UserRepository",
  {
    // Define implementation that uses Logger
    effect: Effect.gen(function* () {
      const logger = yield* Logger;
      return {
        findById: (id: number) =>
          Effect.gen(function* () {
            yield* logger.log(`Finding user ${id}`);
            return { id, name: `User ${id}` };
          })
      };
    }),
    // Declare Logger dependency
    dependencies: [Logger.Default]
  }
) {}

// Example usage
const program = Effect.gen(function* () {
  const repo = yield* UserRepository;
  const user = yield* repo.findById(1);
  return user;
});

// Run with default implementations
Effect.runPromise(
  Effect.provide(
    program,
    UserRepository.Default
  )
).then(console.log);