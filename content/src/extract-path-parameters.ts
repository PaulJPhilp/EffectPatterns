import { Data, Effect } from 'effect'

// Define tagged error for invalid paths
interface InvalidPathErrorSchema {
  readonly _tag: "InvalidPathError"
  readonly path: string
}

const makeInvalidPathError = (path: string): InvalidPathErrorSchema => ({
  _tag: "InvalidPathError",
  path
})

// Define service interface
interface PathOps {
  readonly extractUserId: (path: string) => Effect.Effect<string, InvalidPathErrorSchema>
  readonly greetUser: (userId: string) => Effect.Effect<string>
}

// Create service
class PathService extends Effect.Service<PathService>()(
  "PathService",
  {
    sync: () => ({
      extractUserId: (path: string) =>
        Effect.gen(function* (_) {
          yield* Effect.logInfo(`Attempting to extract user ID from path: ${path}`)
          
          const match = path.match(/\/users\/([^/]+)/);
          if (!match) {
            yield* Effect.logInfo(`No user ID found in path: ${path}`)
            return yield* Effect.fail(makeInvalidPathError(path))
          }
          
          const userId = match[1];
          yield* Effect.logInfo(`Successfully extracted user ID: ${userId}`)
          return userId
        }),

      greetUser: (userId: string) =>
        Effect.gen(function* (_) {
          const greeting = `Hello, user ${userId}!`
          yield* Effect.logInfo(greeting)
          return greeting
        })
    })
  }
) {}

// Compose the functions with proper error handling
const processPath = (path: string): Effect.Effect<string, InvalidPathErrorSchema, PathService> =>
  Effect.gen(function* (_) {
    const pathService = yield* PathService
    yield* Effect.logInfo(`Processing path: ${path}`)
    const userId = yield* pathService.extractUserId(path)
    return yield* pathService.greetUser(userId)
  })

// Run examples with proper error handling
const program = Effect.gen(function* (_) {
  // Test valid paths
  yield* Effect.logInfo("=== Testing valid paths ===")
  const result1 = yield* processPath('/users/123')
  yield* Effect.logInfo(`Result 1: ${result1}`)
  
  const result2 = yield* processPath('/users/abc')
  yield* Effect.logInfo(`Result 2: ${result2}`)
  
  // Test invalid path
  yield* Effect.logInfo("\n=== Testing invalid path ===")
  const result3 = yield* processPath('/invalid/path').pipe(
    Effect.catchTag("InvalidPathError", (error) =>
      Effect.succeed(`Error: Invalid path ${error.path}`)
    )
  )
  yield* Effect.logInfo(result3)
})

Effect.runPromise(
  Effect.provide(program, PathService.Default)
)