# Application Configuration Patterns

## Access Configuration from the Context

Access configuration from the Effect context.

### Example

```typescript
import { Config, Effect, Layer } from "effect";

// Define config service
class AppConfig extends Effect.Service<AppConfig>()(
  "AppConfig",
  {
    sync: () => ({
      host: "localhost",
      port: 3000
    })
  }
) {}

// Create program that uses config
const program = Effect.gen(function* () {
  const config = yield* AppConfig;
  yield* Effect.log(`Starting server on http://${config.host}:${config.port}`);
});

// Run the program with default config
Effect.runPromise(
  Effect.provide(program, AppConfig.Default)
);
```

**Explanation:**  
By yielding the config object, you make your dependency explicit and leverage Effect's context system for testability and modularity.

---

## Define a Type-Safe Configuration Schema

Define a type-safe configuration schema.

### Example

```typescript
import { Config, Effect, ConfigProvider, Layer } from "effect"

const ServerConfig = Config.nested("SERVER")(
  Config.all({
    host: Config.string("HOST"),
    port: Config.number("PORT"),
  })
)

// Example program that uses the config
const program = Effect.gen(function* () {
  const config = yield* ServerConfig
  yield* Effect.logInfo(`Server config loaded: ${JSON.stringify(config)}`)
})

// Create a config provider with test values
const TestConfig = ConfigProvider.fromMap(
  new Map([
    ["SERVER.HOST", "localhost"],
    ["SERVER.PORT", "3000"]
  ])
)

// Run with test config
Effect.runPromise(
  Effect.provide(
    program,
    Layer.setConfigProvider(TestConfig)
  )
)
```

**Explanation:**  
This schema ensures that both `host` and `port` are present and properly typed, and that their source is clearly defined.

---

## Provide Configuration to Your App via a Layer

Provide configuration to your app via a Layer.

### Example

````typescript
import { Effect, Layer } from "effect";

class ServerConfig extends Effect.Service<ServerConfig>()(
  "ServerConfig",
  {
    sync: () => ({
      port: process.env.PORT ? parseInt(process.env.PORT) : 8080
    })
  }
) {}

const program = Effect.gen(function* () {
  const config = yield* ServerConfig;
  yield* Effect.log(`Starting application on port ${config.port}...`);
});

const programWithErrorHandling = Effect.provide(program, ServerConfig.Default).pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Effect.logError(`Program error: ${error}`);
      return null;
    })
  )
);

Effect.runPromise(programWithErrorHandling);
````

**Explanation:**  
This approach makes configuration available contextually, supporting better testing and modularity.

---

