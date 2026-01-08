---
name: effect-patterns-platform-getting-started
description: Effect-TS patterns for Platform Getting Started. Use when working with platform getting started in Effect-TS applications.
---
# Effect-TS Patterns: Platform Getting Started
This skill provides 2 curated Effect-TS patterns for platform getting started.
Use this skill when working on tasks related to:
- platform getting started
- Best practices in Effect-TS applications
- Real-world patterns and solutions

---

## 🟢 Beginner Patterns

### Your First Platform Operation

**Rule:** Use @effect/platform for cross-platform system operations with Effect integration.

**Good Example:**

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

**Rationale:**

Effect Platform provides type-safe, cross-platform system operations. Use `@effect/platform-node` for Node.js or `@effect/platform-bun` for Bun.

---


Platform wraps system operations in Effect, giving you:

1. **Type safety** - File operations return `Effect<Content, PlatformError>`
2. **Resource management** - Files are automatically closed
3. **Cross-platform** - Same code works on Node.js, Bun, browser
4. **Composability** - Chain file ops with other effects

---

---

### Access Environment Variables

**Rule:** Use Effect to access environment variables with proper error handling.

**Good Example:**

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

**Rationale:**

Access environment variables using Effect's built-in functions or Platform's environment service for type-safe configuration.

---


Environment variables can be missing or malformed. Effect helps you:

1. **Handle missing vars** - Return `Option` or fail with typed error
2. **Validate values** - Parse and validate with Schema
3. **Provide defaults** - Fallback values when vars are missing
4. **Document requirements** - Types show what's needed

---

---


