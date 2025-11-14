# Effect-Patterns Runtime Patterns

Found working examples of @effect/cli and @effect/platform-node with NodeContext and NodeRuntime patterns throughout the codebase.

## Working Examples by File

### 1. **CLI Implementation** (Primary Example)
**File:** `/packages/cli/src/index.ts` (Lines 1-2750)

#### Pattern Overview
The CLI demonstrates a complete working pattern for @effect/cli with layer-based dependency injection.

```typescript
import { Args, Command, Options, Prompt } from '@effect/cli';
import { FileSystem, HttpClient } from '@effect/platform';
import { NodeContext, NodeRuntime } from '@effect/platform-node';
import { Console, Effect, Layer, Option, Schema } from 'effect';
```

#### Runtime Execution Pattern (Lines 2734-2743)
```typescript
// NodeContext provides all platform services including FileSystem, Terminal, and Path
const runtimeLayer = Layer.mergeAll(
  FetchHttpClient.layer,
  NodeContext.layer,
);

// Run the CLI program with all dependencies provided
cli(process.argv).pipe(
  Effect.provide(runtimeLayer),
  NodeRuntime.runMain,
);
```

**Key Points:**
- Uses `Layer.mergeAll()` to compose multiple layers
- `FetchHttpClient.layer` for HTTP requests
- `NodeContext.layer` provides file system, terminal, and path services
- `cli(process.argv)` creates the Effect command
- `Effect.provide(runtimeLayer)` injects all dependencies
- `NodeRuntime.runMain` executes the Effect with proper signal handling

---

### 2. **Pattern Server (HTTP)** (Secondary Example)
**File:** `/server/index.ts` (Lines 1-1036)

#### Service Definition Pattern (Lines 87-120)
```typescript
export class RateLimiter extends Effect.Service<RateLimiter>()("RateLimiter", {
  effect: Effect.gen(function* () {
    // In production, this should be Redis or similar
    const store = yield* Ref.make(new Map<string, RateLimitEntry>());

    const checkRateLimit = (ip: string) =>
      Effect.gen(function* () {
        // Implementation...
      });

    return {
      checkRateLimit,
    };
  }),
}) {}
```

#### Server Layer Composition (Lines 950-980)
```typescript
/**
 * Create the HTTP server layer using Node's built-in HTTP server
 */
const ServerLive = NodeHttpServer.layer(() => createServer(), {
  port: DEFAULT_CONFIG.port,
});

/**
 * Main HTTP application layer
 */
const HttpLive = HttpServer.serve(router).pipe(Layer.provide(ServerLive));

// --- MAIN PROGRAM ---

/**
 * Main server program
 * - Logs startup message
 * - Launches the HTTP server
 * - Handles graceful shutdown
 */
const program = Effect.gen(function* () {
  yield* Effect.logInfo(
    `🚀 Pattern Server starting on http://${DEFAULT_CONFIG.host}:${DEFAULT_CONFIG.port}`,
  );
  
  yield* Effect.scoped(
    Effect.gen(function* () {
      yield* Layer.launch(HttpLive);
      yield* Effect.logInfo('✨ Server is ready to accept requests');
      yield* Effect.never;
    }),
  );
}).pipe(
  Effect.provide(RateLimiter.Default),
  Effect.provide(MetricsService.Default),
);
```

#### Runtime Execution (Lines 1000-1015)
```typescript
/**
 * Run the server using NodeRuntime.runMain
 * This handles graceful shutdown on SIGINT/SIGTERM
 */
if (isMainModule) {
  NodeRuntime.runMain(program);
}
```

**Key Points:**
- `NodeHttpServer.layer()` creates the HTTP server layer
- Pass Node's `createServer()` function as first argument
- `HttpServer.serve(router)` creates the serving layer
- `Layer.provide()` chains layer dependencies
- `Effect.scoped()` manages resource lifecycle
- `Layer.launch()` starts the layer inside scoped context
- `Effect.never` keeps server running indefinitely
- Chain `.pipe(Effect.provide(...))` for each service dependency
- `NodeRuntime.runMain()` handles signal-based graceful shutdown

---

### 3. **MCP Server - Initialization** (Dependency Injection Pattern)
**File:** `/services/mcp-server/src/server/init.ts` (Lines 1-126)

#### Service Pattern with Dependencies
```typescript
export class ConfigService extends Effect.Service<ConfigService>()(
  "ConfigService",
  {
    sync: () => ({
      apiKey: process.env.PATTERN_API_KEY || "",
      patternsPath: process.env.PATTERNS_PATH || path.join(process.cwd(), "data", "patterns.json"),
      nodeEnv: process.env.NODE_ENV || "development",
    }),
  }
) {}
```

#### Scoped Service Pattern
```typescript
const makePatternsService = Effect.gen(function* () {
  const config = yield* ConfigService;

  console.log(`[Patterns] Loading patterns from: ${config.patternsPath}`);

  const patternsIndex = yield* Effect.matchEffect(
    loadPatternsFromJsonRunnable(config.patternsPath),
    {
      onFailure: () => Effect.succeed(fallbackIndex),
      onSuccess: (idx) => Effect.succeed(idx),
    }
  );

  const patternsRef = yield* Ref.make<readonly Pattern[]>(
    patternsIndex.patterns
  );

  return {
    patterns: patternsRef,
    getAllPatterns: () => Ref.get(patternsRef),
    getPatternById: (id: string) =>
      Effect.gen(function* () {
        const patterns = yield* Ref.get(patternsRef);
        return patterns.find((p: Pattern) => p.id === id);
      }),
  };
});

export class PatternsService extends Effect.Service<PatternsService>()(
  "PatternsService",
  {
    scoped: makePatternsService,
    dependencies: [ConfigService.Default],
  }
) {}
```

#### Layer Composition
```typescript
export const AppLayer = Layer.mergeAll(
  ConfigService.Default,
  PatternsService.Default,
  TracingLayerLive
);

/**
 * Helper to run an Effect with the app runtime
 *
 * Use this in Next.js route handlers to execute Effects.
 */
export const runWithRuntime = <A, E>(
  effect: Effect.Effect<A, E, PatternsService | ConfigService | TracingService>
): Promise<A> =>
  effect.pipe(
    Effect.provide(AppLayer),
    Effect.scoped,
    Effect.runPromise
  );
```

**Key Points:**
- `sync: () => ({...})` for simple synchronous services
- `scoped: makePatternsService` for services with resource lifecycle
- `dependencies: [ConfigService.Default]` declares explicit dependencies
- `Layer.mergeAll()` composes multiple layers in parallel
- `runWithRuntime()` helper for integration with other frameworks (Next.js)
- `Effect.scoped` ensures resource cleanup
- `Effect.runPromise` for Promise-based environments

---

### 4. **MCP Server - Stdio Transport** (No Effect Runtime)
**File:** `/services/mcp-server-stdio/src/index.ts`

**Note:** This is a direct Node.js implementation using the MCP SDK without Effect runtime, showing it's not always required for all services.

---

### 5. **Rules Documentation Examples**

#### Beginner Level (lines 590-700 of `/rules/beginner.md`)
Shows basic HTTP server setup:
```typescript
const program = Effect.gen(function* () {
  // Server logic
}).pipe(
  Effect.catchAll((error) => /* error handling */),
  Effect.provide(JsonServer.Default),
  Effect.provide(NodeContext.layer)
);

Effect.runPromise(program);
```

#### Intermediate Level (lines 1550-1600 of `/rules/intermediate.md`)
Shows Node.js HTTP server pattern with layers:
```typescript
NodeRuntime.runMain(
  Effect.provide(
    program,
    Layer.provide(
      serverLayer,
      Layer.merge(Database.Default, server)
    )
  ) as Effect.Effect<void, unknown, never>
);
```

---

## Pattern Comparison Summary

| Aspect | CLI | HTTP Server | MCP Server |
|--------|-----|-------------|-----------|
| **Startup** | `Command.run()` + `NodeRuntime.runMain` | `NodeRuntime.runMain(program)` | Direct MCP SDK |
| **Layer Composition** | `Layer.mergeAll(FetchHttpClient.layer, NodeContext.layer)` | `Layer.provide(HttpLive, ServerLive)` or chained `.pipe(Effect.provide(...))` | `Layer.mergeAll(ConfigService.Default, PatternsService.Default, TracingLayerLive)` |
| **Service Pattern** | Not used in CLI, but available | `Effect.Service<ServiceName>()("name", { effect: ... })` | `Effect.Service` with `sync:` or `scoped:` |
| **Resource Management** | Implicit in `NodeRuntime.runMain` | `Effect.scoped()` + `Layer.launch()` | `Effect.scoped` in `runWithRuntime` helper |
| **Promise Integration** | Not applicable | Not used | Via `Effect.runPromise` in `runWithRuntime` |

---

## Recommended Patterns

### For Long-Running Servers
```typescript
const program = Effect.gen(function* () {
  // Server startup logic
  yield* Layer.launch(HttpLive);
  yield* Effect.logInfo('Server ready');
  yield* Effect.never; // Run forever
}).pipe(
  Effect.provide(Service1.Default),
  Effect.provide(Service2.Default),
);

NodeRuntime.runMain(program);
```

### For CLI Applications
```typescript
const runtimeLayer = Layer.mergeAll(
  FetchHttpClient.layer,
  NodeContext.layer,
);

cli(process.argv).pipe(
  Effect.provide(runtimeLayer),
  NodeRuntime.runMain,
);
```

### For Services Used in Other Frameworks (Next.js)
```typescript
export const AppLayer = Layer.mergeAll(
  ConfigService.Default,
  ServiceA.Default,
  ServiceB.Default,
);

export const runWithRuntime = <A, E>(
  effect: Effect.Effect<A, E, ServiceA | ServiceB | ConfigService>
): Promise<A> =>
  effect.pipe(
    Effect.provide(AppLayer),
    Effect.scoped,
    Effect.runPromise
  );
```

---

## Key Takeaways

1. **Always use `NodeRuntime.runMain`** for standalone Node.js applications (CLI, servers)
   - Handles SIGINT/SIGTERM signals automatically
   - Proper process exit codes
   - Resource cleanup via Effect.scoped

2. **Compose layers with `Layer.mergeAll` or `Layer.provide`**
   - `Layer.mergeAll()` for parallel independent layers
   - `Layer.provide()` for layers that depend on each other

3. **Always include `NodeContext.layer`** when using platform services
   - Provides FileSystem, Terminal, Path, and other Node.js services

4. **Use Effect.Service pattern** for reusable services with dependencies
   - `sync: () => ({...})` for simple factories
   - `scoped: ...` for resource-managed services
   - `dependencies: [...]` for explicit dependency declaration

5. **For framework integration**, create a `runWithRuntime` helper
   - Use `Effect.scoped` to manage resource lifecycle
   - Export as `Promise<A>` for async integration
   - Pre-configure all layers in the helper

6. **Chain `.pipe(Effect.provide(...))` carefully**
   - Each `.pipe()` step injects one layer
   - Order matters for dependency resolution
   - Consider using `Layer.mergeAll()` to reduce nesting
