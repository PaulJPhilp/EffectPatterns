---
name: effect-patterns-services-agents
description: Effect-TS service and agent patterns for this repo. Use when implementing or modifying services in packages/mcp-server, adding agents, or following Effect.Service, Layer, and error-handling conventions.
---

# Effect Patterns – Services & Agents

## Effect.Service pattern

Use Effect's Service pattern for composable, type-safe dependency injection:

```typescript
import { Effect, Context } from "effect"

export class MyService extends Context.Tag("MyService")<MyService, {
  method: () => Effect.Effect<string>
}>() {}

const effect = Effect.gen(function* () {
  const service = yield* MyService
  const result = yield* service.method()
  return result
})
```

Modern form with `Effect.Service`:

```typescript
export class MyAgent extends Effect.Service<MyAgent>()("MyAgent", {
  effect: Effect.gen(function* () {
    return {
      analyze: (input: string) => Effect.succeed("result")
    }
  })
})
```

## Service / agent structure

Use this layout for agents and service modules:

```
agents/
├── analyzer/
│   ├── api.ts          # Public interface
│   ├── schema.ts       # Type definitions
│   ├── service.ts      # Core logic
│   ├── types.ts        # Domain types
│   └── __tests__/      # Test suite
```

## Error handling as values

Use tagged error types; recover with `catchTag`:

```typescript
import { Data } from "effect"

export class APIError extends Data.TaggedError("APIError")<{
  readonly status: number
  readonly message: string
}> {}

Effect.catchTag("APIError", (err) => /* handle */)
```

## Layered service composition

Compose services via `Effect.Layer`; provide to the app with `Effect.provide`:

```typescript
const appLayer = Layer.mergeAll(
  ConfigService.layer,
  CacheService.layer,
  CircuitBreakerService.layer,
  RateLimiterService.layer,
  ReviewCodeService.layer,
)

Effect.provide(appEffect, appLayer)
```

## Conventions in this repo

- **Effect-TS native**: Use Effect for composability and error handling.
- **Type safety**: Use @effect/schema for types and validation.
- **No path aliases**: Use `workspace:*` dependencies; run from project root.
- **Debug from root**: e.g. `scripts/debug-blocking.ts` for correct module resolution.
