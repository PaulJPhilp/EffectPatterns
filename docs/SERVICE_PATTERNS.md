# Effect Service & Test Suite Patterns

This document outlines the patterns used for defining services and writing test suites in this Effect TypeScript project.

## Service Definition Pattern

### Modern Effect.Service Pattern

All services in this project use the **Effect.Service** pattern, which provides type-safe dependency injection and automatic layer management.

#### Basic Service Structure

```typescript
import { Effect } from "effect";
import { FileSystem, Path } from "@effect/platform";

export class MyService extends Effect.Service<MyService>()("MyService", {
  // Enable static accessor methods
  accessors: true,
  
  // Service implementation using Effect.gen for dependency injection
  effect: Effect.gen(function* () {
    // Access dependencies using yield*
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    
    // Service implementation
    return {
      myMethod: (param: string) => Effect.gen(function* () {
        // Implementation using dependencies
        const filePath = path.join("data", param);
        const content = yield* fs.readFileString(filePath);
        return content;
      })
    };
  })
}) {}
```

#### Key Features

1. **Static Class Methods**: Use `accessors: true` to enable `MyService.myMethod` static accessors
2. **Dependency Injection**: Use `yield*` to access dependencies within `Effect.gen`
3. **Type Safety**: Full TypeScript type inference for all service methods
4. **Layer Integration**: Automatic `.Default` layer generation

#### Service with Dependencies

```typescript
export class UserService extends Effect.Service<UserService>()("UserService", {
  effect: Effect.gen(function* () {
    const db = yield* DatabaseService;
    const logger = yield* LoggerService;
    
    return {
      getUser: (id: string) => Effect.gen(function* () {
        yield* logger.log(`Fetching user ${id}`);
        return yield* db.query(`SELECT * FROM users WHERE id = ${id}`);
      })
    };
  }),
  // Specify dependencies for automatic layer composition
  dependencies: [DatabaseService.Default, LoggerService.Default]
}) {}
```

### Service API Pattern

Services typically have an accompanying API layer that provides a clean interface:

```typescript
// service.ts - Service definition
export class UserService extends Effect.Service<UserService>()("UserService", {
  effect: Effect.gen(function* () {
    return {
      getUser: (id: string) => Effect.succeed({ id, name: "John" })
    };
  })
}) {}

// api.ts - Public API
export class UserApi extends Effect.Service<UserApi>()("UserApi", {
  effect: Effect.gen(function* () {
    const userService = yield* UserService;
    
    return {
      getUserProfile: (id: string) => userService.getUser(id)
    };
  }),
  dependencies: [UserService.Default]
}) {}
```

### Import Patterns

Use direct named imports from Effect libraries:

```typescript
// ✅ Preferred
import { Effect, Layer } from "effect";
import { FileSystem } from "@effect/platform";

// ❌ Avoid
import * as Effect from "effect";
import * as FileSystem from "@effect/platform/FileSystem";
```

## Test Suite Pattern

### Test Setup

All tests use **Vitest** as the testing framework with Effect integration:

```typescript
import { describe, it, expect } from "vitest";
import { Effect, Layer } from "effect";
import { MyService } from "../service.js";
import { NodeContext } from "@effect/platform-node";

// Test layer composition
const testLayer = Layer.provide(
  MyService.Default,
  NodeContext.layer // Provides platform services
);
```

### Test Structure

#### Basic Test Pattern

```typescript
describe("MyService", () => {
  it("should perform operation", () => 
    Effect.gen(function* () {
      const service = yield* MyService;
      const result = yield* service.myMethod("test");
      expect(result).toBe("expected");
    }).pipe(Effect.provide(testLayer))
  );
});
```

#### Async Test Pattern

```typescript
describe("MyService", () => {
  it("should handle async operations", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* MyService;
        return yield* service.asyncMethod("test");
      }).pipe(Effect.provide(testLayer))
    );
    
    expect(result).toBe("expected");
  });
});
```

#### Error Handling Tests

```typescript
describe("MyService", () => {
  it("should handle errors", () => 
    Effect.gen(function* () {
      const service = yield* MyService;
      const result = yield* service.errorMethod("invalid").pipe(
        Effect.flip // Convert success to error for testing
      );
      
      expect(result.message).toContain("Invalid input");
    }).pipe(Effect.provide(testLayer))
  );
});
```

### Test Layer Composition

#### Simple Layer

```typescript
const testLayer = Layer.provide(
  MyService.Default,
  NodeContext.layer
);
```

#### Complex Layer with Dependencies

```typescript
const testLayer = Layer.provide(
  UserApi.Default,
  Layer.mergeAll(
    UserService.Default,
    DatabaseService.Default,
    NodeContext.layer
  )
);
```

#### Test with Real Services

Always use real services instead of mocks:

```typescript
// ✅ Preferred - use real services
const testLayer = Layer.provide(
  MyService.Default,
  NodeFileSystem.layer
);

// ❌ Avoid - don't mock unless absolutely necessary
const mockLayer = Layer.provide(
  MyService.Default,
  mockFileSystemLayer
);
```

### Test Organization

#### Service Tests

Place service tests in `__tests__` directory adjacent to service:

```
services/
  my-service/
    service.ts
    types.ts
    errors.ts
    api.ts
    __tests__/
      service.test.ts
```

#### Integration Tests

Place integration tests in `__tests__/integration/`:

```
src/
  __tests__/
    integration/
      cli-flows.test.ts
      cross-command.test.ts
```

## Error Handling Pattern

### Custom Error Types

```typescript
import { Data } from "effect";

export class ServiceError extends Data.TaggedError("ServiceError")<{
  message: string;
  cause?: unknown;
}> {}

// Usage in service
return {
  riskyOperation: () => Effect.gen(function* () {
    try {
      // operation
    } catch (cause) {
      yield* Effect.fail(new ServiceError({ message: "Operation failed", cause }));
    }
  })
};
```

### Error Handling in Tests

```typescript
it("should handle service errors", () => 
  Effect.gen(function* () {
    const service = yield* MyService;
    const error = yield* service.riskyOperation("invalid").pipe(
      Effect.flip
    );
    
    expect(error).toBeInstanceOf(ServiceError);
    expect(error.message).toBe("Operation failed");
  }).pipe(Effect.provide(testLayer))
);
```

## Configuration Pattern

### Service Configuration

```typescript
export class ConfigService extends Effect.Service<ConfigService>()("ConfigService", {
  effect: Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    
    const loadConfig = Effect.gen(function* () {
      const configPath = path.join(process.cwd(), "config.json");
      const content = yield* fs.readFileString(configPath);
      return JSON.parse(content);
    });
    
    return {
      getConfig: () => loadConfig
    };
  })
}) {}
```

### Test Configuration

```typescript
// Override configuration for tests
const testConfig = {
  apiKey: "test-key",
  endpoint: "http://localhost:3000"
};

const testLayer = Layer.provide(
  ConfigService.Default,
  Layer.merge(
    NodeContext.layer,
    Layer.succeed(ConfigService, testConfig)
  )
);
```

## Running Tests

### Using Effect.runPromise

```typescript
await Effect.runPromise(
  Effect.gen(function* () {
    // test logic
  }).pipe(Effect.provide(testLayer))
);
```

### Using Test Runtime

For complex test scenarios, use the managed runtime:

```typescript
import { runTestEffect } from "../runtime/testing-runtime.js";

it("should work with test runtime", async () => {
  await runTestEffect(
    Effect.gen(function* () {
      const service = yield* MyService;
      return yield* service.complexOperation();
    })
  );
});
```

## Best Practices Summary

1. **Always use Effect.Service pattern** for service definitions
2. **Use real services** in tests instead of mocks
3. **Provide platform dependencies** using `NodeContext.layer`
4. **Use proper error handling** with custom error types
5. **Organize tests** by service with clear naming
6. **Use direct imports** from Effect libraries
7. **Test both success and error cases** comprehensively
8. **Use async/await** for test execution with `Effect.runPromise`

## Common Patterns Reference

| Pattern | Usage |
|---------|--------|
| `Effect.gen(function* () => {...})` | Generator-based effect composition |
| `yield* Service` | Access service dependencies |
| `Effect.provide(layer)` | Provide dependencies to effects |
| `Layer.mergeAll(...layers)` | Combine multiple layers |
| `Effect.flip` | Convert success to error for testing |
| `Effect.runPromise(effect)` | Execute effects in tests |
| `describe/it` | Vitest test structure |

This pattern ensures consistent, type-safe, and maintainable services and tests throughout the Effect TypeScript codebase.
