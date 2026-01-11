---
name: effect-patterns-tooling-and-debugging
description: Effect-TS patterns for Tooling And Debugging. Use when working with tooling and debugging in Effect-TS applications.
---
# Effect-TS Patterns: Tooling And Debugging
This skill provides 8 curated Effect-TS patterns for tooling and debugging.
Use this skill when working on tasks related to:
- tooling and debugging
- Best practices in Effect-TS applications
- Real-world patterns and solutions

---

## 🟢 Beginner Patterns

### Read Effect Type Errors

**Rule:** Effect errors are verbose but structured - learn to extract the key information.

**Rationale:**

Effect type errors can be long, but they follow a pattern. Learn to scan for the key parts.

---


Effect's type system catches many bugs at compile time, but:

1. **Effect types are complex** - Three type parameters
2. **Errors are nested** - Multiple layers of generics
3. **Messages are verbose** - TypeScript shows everything

Understanding the pattern makes errors manageable.

---

---

### Set Up Your Effect Development Environment

**Rule:** Install the Effect extension and configure TypeScript for optimal Effect development.

**Rationale:**

Set up your development environment with the Effect extension and proper TypeScript configuration for the best experience.

---


A well-configured environment helps you:

1. **See types clearly** - Effect types can be complex
2. **Get better autocomplete** - Know what methods are available
3. **Catch errors early** - TypeScript finds problems
4. **Navigate easily** - Go to definitions, find references

---

---


## 🟡 Intermediate Patterns

### Supercharge Your Editor with the Effect LSP

**Rule:** Install and use the Effect LSP extension for enhanced type information and error checking in your editor.

**Good Example:**

Imagine you have the following code. Without the LSP, hovering over `program` might show a complex, hard-to-read inferred type.

```typescript
import { Effect } from "effect";

// Define Logger service using Effect.Service pattern
class Logger extends Effect.Service<Logger>()("Logger", {
  sync: () => ({
    log: (msg: string) => Effect.log(`LOG: ${msg}`),
  }),
}) {}

const program = Effect.succeed(42).pipe(
  Effect.map((n) => n.toString()),
  Effect.flatMap((s) => Effect.log(s)),
  Effect.provide(Logger.Default)
);

// Run the program
Effect.runPromise(program);
```

With the Effect LSP installed, your editor would display a clear, readable overlay right above the `program` variable, looking something like this:

```
// (LSP Inlay Hint)
// program: Effect<void, never, never>
```

This immediately tells you that the final program returns nothing (`void`), has no expected failures (`never`), and has no remaining requirements (`never`), so it's ready to be run.

---

**Anti-Pattern:**

Going without the LSP. While your code will still compile and work perfectly fine, you are essentially "flying blind." You miss out on the rich, real-time feedback that the LSP provides, forcing you to rely more heavily on manual type checking, `tsc` runs, and deciphering complex inferred types from your editor's default tooltips. This leads to a slower, less efficient development cycle.

**Rationale:**

To significantly improve your development experience with Effect, install the official **Effect Language Server (LSP)** extension for your code editor (e.g., the "Effect" extension in VS Code).

---


Effect's type system is incredibly powerful, but TypeScript's default language server doesn't always display the rich information contained within the `A`, `E`, and `R` channels in the most intuitive way.

The Effect LSP is a specialized tool that understands the semantics of Effect. It hooks into your editor to provide a superior experience:

- **Rich Inline Types:** It displays the full `Effect<A, E, R>` signature directly in your code as you work, so you always know exactly what an effect produces, how it can fail, and what it requires.
- **Clear Error Messages:** It provides more specific and helpful error messages tailored to Effect's APIs.
- **Enhanced Autocompletion:** It can offer more context-aware suggestions.

This tool essentially makes the compiler's knowledge visible at a glance, reducing the mental overhead of tracking complex types and allowing you to catch errors before you even save the file.

---

---

### Use Effect DevTools

**Rule:** Use Effect's built-in debugging features and logging for development.

**Good Example:**

### 1. Enable Debug Mode

```typescript
import { Effect, Logger, LogLevel, FiberRef, Cause } from "effect"

// ============================================
// 1. Verbose logging for development
// ============================================

const debugProgram = Effect.gen(function* () {
  yield* Effect.logDebug("Starting operation")

  const result = yield* someEffect.pipe(
    Effect.tap((value) => Effect.logDebug(`Got value: ${value}`))
  )

  yield* Effect.logDebug("Operation complete")
  return result
})

// Run with debug logging enabled
const runWithDebug = debugProgram.pipe(
  Logger.withMinimumLogLevel(LogLevel.Debug),
  Effect.runPromise
)

// ============================================
// 2. Fiber supervision and introspection
// ============================================

const inspectFibers = Effect.gen(function* () {
  // Fork some fibers
  const fiber1 = yield* Effect.fork(Effect.sleep("1 second"))
  const fiber2 = yield* Effect.fork(Effect.sleep("2 seconds"))

  // Get fiber IDs
  yield* Effect.log(`Fiber 1 ID: ${fiber1.id()}`)
  yield* Effect.log(`Fiber 2 ID: ${fiber2.id()}`)

  // Check fiber status
  const status1 = yield* fiber1.status
  yield* Effect.log(`Fiber 1 status: ${status1._tag}`)
})

// ============================================
// 3. Trace execution with spans
// ============================================

const tracedProgram = Effect.gen(function* () {
  yield* Effect.log("=== Starting traced program ===")

  yield* Effect.gen(function* () {
    yield* Effect.log("Step 1: Initialize")
    yield* Effect.sleep("100 millis")
  }).pipe(Effect.withLogSpan("initialization"))

  yield* Effect.gen(function* () {
    yield* Effect.log("Step 2: Process")
    yield* Effect.sleep("200 millis")
  }).pipe(Effect.withLogSpan("processing"))

  yield* Effect.gen(function* () {
    yield* Effect.log("Step 3: Finalize")
    yield* Effect.sleep("50 millis")
  }).pipe(Effect.withLogSpan("finalization"))

  yield* Effect.log("=== Program complete ===")
})

// ============================================
// 4. Error cause inspection
// ============================================

const debugErrors = Effect.gen(function* () {
  const failingEffect = Effect.gen(function* () {
    yield* Effect.fail(new Error("Inner error"))
  }).pipe(
    Effect.flatMap(() => Effect.fail(new Error("Outer error")))
  )

  yield* failingEffect.pipe(
    Effect.catchAllCause((cause) =>
      Effect.gen(function* () {
        yield* Effect.log("=== Error Cause Analysis ===")
        yield* Effect.log(`Pretty printed:\n${Cause.pretty(cause)}`)
        yield* Effect.log(`Is failure: ${Cause.isFailure(cause)}`)
        yield* Effect.log(`Is interrupted: ${Cause.isInterrupted(cause)}`)

        // Extract all failures
        const failures = Cause.failures(cause)
        yield* Effect.log(`Failures: ${JSON.stringify([...failures])}`)

        return "recovered"
      })
    )
  )
})

// ============================================
// 5. Context inspection
// ============================================

import { Context } from "effect"

class Config extends Context.Tag("Config")<Config, { debug: boolean }>() {}

const inspectContext = Effect.gen(function* () {
  const context = yield* Effect.context<Config>()

  yield* Effect.log("=== Context Contents ===")
  yield* Effect.log(`Has Config: ${Context.getOption(context, Config)._tag}`)
})

// ============================================
// 6. Custom logger for development
// ============================================

const devLogger = Logger.make(({ logLevel, message, date, annotations, spans }) => {
  const timestamp = date.toISOString()
  const level = logLevel.label.padEnd(7)
  const spanInfo = spans.length > 0
    ? ` [${[...spans].map(([name]) => name).join(" > ")}]`
    : ""
  const annotationInfo = Object.keys(annotations).length > 0
    ? ` ${JSON.stringify(Object.fromEntries(annotations))}`
    : ""

  console.log(`${timestamp} ${level}${spanInfo} ${message}${annotationInfo}`)
})

const withDevLogger = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.provide(Logger.replace(Logger.defaultLogger, devLogger))
  )

// ============================================
// 7. Runtime metrics
// ============================================

const showRuntimeMetrics = Effect.gen(function* () {
  const runtime = yield* Effect.runtime()

  yield* Effect.log("=== Runtime Info ===")
  // Access runtime configuration
  const fiberRefs = runtime.fiberRefs

  yield* Effect.log("FiberRefs available")
})

// ============================================
// 8. Putting it all together
// ============================================

const debugSession = Effect.gen(function* () {
  yield* Effect.log("Starting debug session")

  // Run with all debugging enabled
  yield* tracedProgram.pipe(
    withDevLogger,
    Logger.withMinimumLogLevel(LogLevel.Debug)
  )

  yield* debugErrors

  yield* Effect.log("Debug session complete")
})

Effect.runPromise(debugSession)
```

### Debug Output Example

```
2024-01-15T10:30:00.000Z DEBUG   [initialization] Step 1: Initialize
2024-01-15T10:30:00.100Z DEBUG   [processing] Step 2: Process
2024-01-15T10:30:00.300Z DEBUG   [finalization] Step 3: Finalize
2024-01-15T10:30:00.350Z INFO    Program complete
```

**Rationale:**

Use Effect's built-in debugging capabilities, logging, and fiber introspection for development.

---


Effect DevTools help you:

1. **See fiber state** - What's running, blocked, completed
2. **Trace execution** - Follow the flow of effects
3. **Debug errors** - Understand failure chains
4. **Profile performance** - Find slow operations

---

---

### Configure Linting for Effect

**Rule:** Use Biome for fast linting with Effect-friendly configuration.

**Good Example:**

### 1. Biome Configuration (Recommended)

```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.8.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noExcessiveCognitiveComplexity": "warn",
        "noForEach": "off",  // Effect uses forEach patterns
        "useLiteralKeys": "off"  // Effect uses computed keys
      },
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error",
        "useExhaustiveDependencies": "warn"
      },
      "style": {
        "noNonNullAssertion": "warn",
        "useConst": "error",
        "noParameterAssign": "error"
      },
      "suspicious": {
        "noExplicitAny": "warn",
        "noConfusingVoidType": "off"  // Effect uses void
      },
      "nursery": {
        "noRestrictedImports": {
          "level": "error",
          "options": {
            "paths": {
              "lodash": "Use Effect functions instead",
              "ramda": "Use Effect functions instead"
            }
          }
        }
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "semicolons": "asNeeded",
      "quoteStyle": "double",
      "trailingComma": "es5"
    }
  },
  "files": {
    "ignore": [
      "node_modules",
      "dist",
      "coverage",
      "*.gen.ts"
    ]
  }
}
```

### 2. ESLint Configuration (Alternative)

```javascript
// eslint.config.js
import eslint from "@eslint/js"
import tseslint from "typescript-eslint"

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript strict rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" }
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-floating-promises": "error",

      // Effect-friendly rules
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: false }
      ],

      // Style rules
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-template": "error",
    },
  },
  {
    files: ["**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    ignores: ["dist/", "coverage/", "node_modules/"],
  }
)
```

### 3. Package.json Scripts

```json
{
  "scripts": {
    "lint": "biome check .",
    "lint:fix": "biome check --apply .",
    "lint:ci": "biome ci .",
    "format": "biome format --write .",
    "format:check": "biome format ."
  }
}
```

### 4. VS Code Integration

```json
// .vscode/settings.json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  },
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "biomejs.biome"
  }
}
```

### 5. Pre-commit Hook

```json
// package.json
{
  "scripts": {
    "prepare": "husky"
  }
}
```

```bash
# .husky/pre-commit
bun run lint:ci
bun run typecheck
```

### 6. Effect-Specific Rules to Consider

```typescript
// Custom rules you might want

// ❌ Bad: Using Promise where Effect should be used
const fetchData = async () => { }  // Warn in Effect codebase

// ✅ Good: Using Effect
const fetchData = Effect.gen(function* () { })

// ❌ Bad: Throwing errors
const validate = (x: unknown) => {
  if (!x) throw new Error("Invalid")  // Error
}

// ✅ Good: Returning Effect with error
const validate = (x: unknown) =>
  x ? Effect.succeed(x) : Effect.fail(new ValidationError())

// ❌ Bad: Using null/undefined directly
const maybeValue: string | null = null  // Warn

// ✅ Good: Using Option
const maybeValue: Option.Option<string> = Option.none()
```

**Rationale:**

Configure Biome (recommended) or ESLint with rules that work well with Effect's functional patterns.

---


Good linting for Effect:

1. **Catches errors** - Unused variables, missing awaits
2. **Enforces style** - Consistent code across team
3. **Avoids antipatterns** - No implicit any, proper typing
4. **Fast feedback** - Errors in editor immediately

---

---

### Set Up CI/CD for Effect Projects

**Rule:** Use GitHub Actions with proper caching for fast Effect project CI/CD.

**Good Example:**

### 1. Basic GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [20.x, 22.x]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Type check
        run: bun run typecheck

      - name: Lint
        run: bun run lint

      - name: Test
        run: bun run test

      - name: Build
        run: bun run build
```

### 2. With Caching

```yaml
# .github/workflows/ci-cached.yml
name: CI (Cached)

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      # Cache Bun dependencies
      - name: Cache dependencies
        uses: actions/cache@v4
        with:
          path: |
            ~/.bun/install/cache
            node_modules
          key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lockb') }}
          restore-keys: |
            ${{ runner.os }}-bun-

      - name: Install dependencies
        run: bun install

      # Cache TypeScript build info
      - name: Cache TypeScript
        uses: actions/cache@v4
        with:
          path: |
            .tsbuildinfo
            dist
          key: ${{ runner.os }}-tsc-${{ hashFiles('**/tsconfig.json', 'src/**/*.ts') }}
          restore-keys: |
            ${{ runner.os }}-tsc-

      - name: Type check
        run: bun run typecheck

      - name: Lint
        run: bun run lint

      - name: Test
        run: bun run test --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
```

### 3. Package.json Scripts

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "biome check .",
    "lint:fix": "biome check --apply .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "build": "tsc",
    "clean": "rm -rf dist .tsbuildinfo"
  }
}
```

### 4. Multi-Stage Workflow

```yaml
# .github/workflows/ci-full.yml
name: CI Full

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run typecheck

  test:
    runs-on: ubuntu-latest
    needs: [lint, typecheck]
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run test

  build:
    runs-on: ubuntu-latest
    needs: [test]
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  deploy:
    runs-on: ubuntu-latest
    needs: [build]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist
      # Add deployment steps
```

### 5. Release Workflow

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1

      - run: bun install
      - run: bun run build
      - run: bun run test

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: dist/*
          generate_release_notes: true
```

**Rationale:**

Set up CI/CD with type checking, testing, and optional deployment stages optimized for Effect projects.

---


CI/CD for Effect projects ensures:

1. **Type safety** - Catch type errors before merge
2. **Test coverage** - Run tests automatically
3. **Consistent builds** - Same environment every time
4. **Fast feedback** - Know quickly if something broke

---

---


## 🟠 Advanced Patterns

### Profile Effect Applications

**Rule:** Use Effect's timing features and Node.js profilers to find performance bottlenecks.

**Good Example:**

### 1. Basic Timing with Spans

```typescript
import { Effect, Duration } from "effect"

// ============================================
// 1. Time individual operations
// ============================================

const timeOperation = <A, E, R>(
  name: string,
  effect: Effect.Effect<A, E, R>
) =>
  Effect.gen(function* () {
    const startTime = Date.now()

    const result = yield* effect

    const duration = Date.now() - startTime
    yield* Effect.log(`${name}: ${duration}ms`)

    return result
  })

// Usage
const program = Effect.gen(function* () {
  yield* timeOperation("database-query", queryDatabase())
  yield* timeOperation("api-call", callExternalApi())
  yield* timeOperation("processing", processData())
})

// ============================================
// 2. Use withLogSpan for nested timing
// ============================================

const timedProgram = Effect.gen(function* () {
  yield* Effect.log("Starting")

  yield* fetchUsers().pipe(Effect.withLogSpan("fetchUsers"))

  yield* processUsers().pipe(Effect.withLogSpan("processUsers"))

  yield* saveResults().pipe(Effect.withLogSpan("saveResults"))

  yield* Effect.log("Complete")
}).pipe(Effect.withLogSpan("total"))

// ============================================
// 3. Collect timing metrics
// ============================================

import { Metric } from "effect"

const operationDuration = Metric.histogram("operation_duration_ms", {
  description: "Operation duration in milliseconds",
  boundaries: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
})

const profiledEffect = <A, E, R>(
  name: string,
  effect: Effect.Effect<A, E, R>
) =>
  Effect.gen(function* () {
    const startTime = Date.now()

    const result = yield* effect

    const duration = Date.now() - startTime
    yield* Metric.update(
      operationDuration.pipe(Metric.tagged("operation", name)),
      duration
    )

    return result
  })

// ============================================
// 4. Memory profiling
// ============================================

const logMemoryUsage = Effect.sync(() => {
  const usage = process.memoryUsage()
  return {
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
    external: Math.round(usage.external / 1024 / 1024),
    rss: Math.round(usage.rss / 1024 / 1024),
  }
})

const withMemoryLogging = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    const before = yield* logMemoryUsage
    yield* Effect.log(`Memory before: ${JSON.stringify(before)}MB`)

    const result = yield* effect

    const after = yield* logMemoryUsage
    yield* Effect.log(`Memory after: ${JSON.stringify(after)}MB`)
    yield* Effect.log(`Memory delta: ${after.heapUsed - before.heapUsed}MB`)

    return result
  })

// ============================================
// 5. CPU profiling with Node.js inspector
// ============================================

const withCpuProfile = <A, E, R>(
  name: string,
  effect: Effect.Effect<A, E, R>
) =>
  Effect.gen(function* () {
    // Start CPU profiler (requires --inspect flag)
    const inspector = yield* Effect.try(() => {
      const { Session } = require("inspector")
      const session = new Session()
      session.connect()
      return session
    })

    yield* Effect.try(() => {
      inspector.post("Profiler.enable")
      inspector.post("Profiler.start")
    })

    const result = yield* effect

    // Stop and save profile
    yield* Effect.async<void>((resume) => {
      inspector.post("Profiler.stop", (err: Error, { profile }: any) => {
        if (err) {
          resume(Effect.fail(err))
        } else {
          const fs = require("fs")
          fs.writeFileSync(
            `${name}-${Date.now()}.cpuprofile`,
            JSON.stringify(profile)
          )
          resume(Effect.void)
        }
      })
    })

    return result
  })

// ============================================
// 6. Benchmark specific operations
// ============================================

const benchmark = <A, E, R>(
  name: string,
  effect: Effect.Effect<A, E, R>,
  iterations: number = 100
) =>
  Effect.gen(function* () {
    const times: number[] = []

    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      yield* effect
      times.push(performance.now() - start)
    }

    const sorted = times.sort((a, b) => a - b)
    const stats = {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      mean: times.reduce((a, b) => a + b, 0) / times.length,
    }

    yield* Effect.log(`Benchmark "${name}" (${iterations} iterations):`)
    yield* Effect.log(`  Min:    ${stats.min.toFixed(2)}ms`)
    yield* Effect.log(`  Max:    ${stats.max.toFixed(2)}ms`)
    yield* Effect.log(`  Mean:   ${stats.mean.toFixed(2)}ms`)
    yield* Effect.log(`  Median: ${stats.median.toFixed(2)}ms`)
    yield* Effect.log(`  P95:    ${stats.p95.toFixed(2)}ms`)
    yield* Effect.log(`  P99:    ${stats.p99.toFixed(2)}ms`)

    return stats
  })

// ============================================
// 7. Profile concurrent operations
// ============================================

const profileConcurrency = Effect.gen(function* () {
  const items = Array.from({ length: 100 }, (_, i) => i)

  // Sequential
  yield* benchmark(
    "sequential",
    Effect.forEach(items, (i) => Effect.succeed(i * 2), { concurrency: 1 }),
    10
  )

  // Parallel unbounded
  yield* benchmark(
    "parallel-unbounded",
    Effect.forEach(items, (i) => Effect.succeed(i * 2), {
      concurrency: "unbounded",
    }),
    10
  )

  // Parallel limited
  yield* benchmark(
    "parallel-10",
    Effect.forEach(items, (i) => Effect.succeed(i * 2), { concurrency: 10 }),
    10
  )
})

// ============================================
// 8. Run profiling
// ============================================

const profilingSession = Effect.gen(function* () {
  yield* Effect.log("=== Profiling Session ===")

  yield* withMemoryLogging(
    benchmark("my-operation", someEffect, 50)
  )

  yield* profileConcurrency
})

Effect.runPromise(profilingSession)
```

**Rationale:**

Profile Effect applications using built-in timing spans, metrics, and Node.js profiling tools.

---


Profiling helps you:

1. **Find bottlenecks** - What's slow?
2. **Optimize hot paths** - Focus effort where it matters
3. **Track regressions** - Catch slowdowns early
4. **Right-size resources** - Don't over-provision

---

---

### Teach your AI Agents Effect with the MCP Server

**Rule:** Use the MCP server to provide live application context to AI coding agents, enabling more accurate assistance.

**Good Example:**

The "Good Example" is the workflow this pattern enables.

1.  **You run the MCP server** in your terminal, pointing it at your main `AppLayer`.

    ```bash
    npx @effect/mcp-server --layer src/layers.ts:AppLayer
    ```

2.  **You configure your AI agent** (e.g., Cursor) to use the MCP server's endpoint (`http://localhost:3333`).

3.  **You ask the AI a question** that requires deep context about your app:

    > "Refactor this code to use the `UserService` to fetch a user by ID and log the result with the `Logger`."

4.  **The AI, in the background, queries the MCP server:**

    - It discovers that `UserService` and `Logger` are available in the `AppLayer`.
    - It retrieves the exact method signature for `UserService.getUser` and `Logger.log`.

5.  **The AI generates correct, context-aware code** because it's not guessing; it's using the live architectural information provided by the MCP server.

```typescript
// The AI generates this correct code:
import { Effect } from "effect";
import { UserService } from "./features/User/UserService.js";
const program = Effect.gen(function* () {
  const userService = yield* UserService;

  const user = yield* userService.getUser("123");
  yield* Effect.log(`Found user: ${user.name}`);
});
```

---

**Anti-Pattern:**

Working with an AI agent without providing it with specific context. The agent will be forced to guess based on open files or generic knowledge. This often leads to it hallucinating method names, getting dependency injection wrong, or failing to handle specific error types, requiring you to manually correct its output and defeating the purpose of using an AI assistant.

**Rationale:**

To enable AI coding agents (like Cursor or custom bots) to provide highly accurate, context-aware assistance for your Effect application, run the **Effect MCP (Meta-Circular-Protocol) server**. This tool exposes your application's entire dependency graph and service structure in a machine-readable format.

---


AI coding agents are powerful, but they often lack the deep, structural understanding of a complex Effect application. They might not know which services are available in the context, what a specific `Layer` provides, or how your feature modules are composed.

The MCP server solves this problem. It's a specialized server that runs alongside your application during development. It inspects your `AppLayer` and creates a real-time, queryable model of your entire application architecture.

An AI agent can then connect to this MCP server to ask specific questions before generating code, such as:

- "What services are available in the current context?"
- "What is the full API of the `UserService`?"
- "What errors can `UserRepository.findById` fail with?"

By providing this live, ground-truth context, you transform your AI from a generic coding assistant into a specialized expert on _your_ specific codebase, resulting in far more accurate and useful code generation and refactoring.

---

---


