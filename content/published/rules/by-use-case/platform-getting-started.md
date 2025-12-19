# platform-getting-started Patterns

## Access Environment Variables

Use Effect to access environment variables with proper error handling.

### Example

```typescript
import { Effect, Config, Option } from "effect"

// ============================================
// BASIC: Read required variable
// ============================================

const getApiKey = Config.string("API_KEY")

const program1 = Effect.gen(function* () {
  const apiKey = yield* getApiKey
  yield* Effect.log(`API Key: ${apiKey.slice(0, 4)}...`)
})

// ============================================
// OPTIONAL: With default value
// ============================================

const getPort = Config.number("PORT").pipe(
  Config.withDefault(3000)
)

const program2 = Effect.gen(function* () {
  const port = yield* getPort
  yield* Effect.log(`Server will run on port ${port}`)
})

// ============================================
// OPTIONAL: Return Option instead of failing
// ============================================

const getOptionalFeature = Config.string("FEATURE_FLAG").pipe(
  Config.option
)

const program3 = Effect.gen(function* () {
  const feature = yield* getOptionalFeature
  
  if (Option.isSome(feature)) {
    yield* Effect.log(`Feature enabled: ${feature.value}`)
  } else {
    yield* Effect.log("Feature flag not set")
  }
})

// ============================================
// COMBINED: Multiple variables as config object
// ============================================

const AppConfig = Config.all({
  apiKey: Config.string("API_KEY"),
  apiUrl: Config.string("API_URL"),
  port: Config.number("PORT").pipe(Config.withDefault(3000)),
  debug: Config.boolean("DEBUG").pipe(Config.withDefault(false)),
})

const program4 = Effect.gen(function* () {
  const config = yield* AppConfig
  
  yield* Effect.log(`API URL: ${config.apiUrl}`)
  yield* Effect.log(`Port: ${config.port}`)
  yield* Effect.log(`Debug: ${config.debug}`)
})

// ============================================
// RUN: Will fail if required vars missing
// ============================================

Effect.runPromise(program4).catch((error) => {
  console.error("Missing required environment variables")
  console.error(error)
})
```

---

## Your First Platform Operation

Use @effect/platform for cross-platform system operations with Effect integration.

### Example

```typescript
import { Effect } from "effect"
import { FileSystem } from "@effect/platform"
import { NodeContext, NodeRuntime } from "@effect/platform-node"

// Read a file - returns Effect<string, PlatformError>
const readConfig = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  
  // Read file as UTF-8 string
  const content = yield* fs.readFileString("./config.json")
  
  return JSON.parse(content)
})

// Write a file
const writeLog = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  
  yield* fs.writeFileString(
    "./app.log",
    `Started at ${new Date().toISOString()}\n`
  )
})

// Combine operations
const program = Effect.gen(function* () {
  const config = yield* readConfig
  yield* Effect.log(`Loaded config: ${config.appName}`)
  
  yield* writeLog
  yield* Effect.log("Log file created")
})

// Run with Node.js platform
program.pipe(
  Effect.provide(NodeContext.layer),
  NodeRuntime.runMain
)
```

---

