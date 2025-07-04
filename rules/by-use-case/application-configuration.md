## Access Configuration from the Context
**Rule:** Access configuration from the Effect context.

### Example
```typescript
import { Config, Effect } from "effect";

const ServerConfig = Config.all({
  host: Config.string("HOST"),
  port: Config.number("PORT"),
});

const program = Effect.gen(function* () {
  const config = yield* ServerConfig;
  yield* Effect.log(`Starting server on http://${config.host}:${config.port}`);
});
```

**Explanation:**  
By yielding the config object, you make your dependency explicit and leverage Effect's context system for testability and modularity.

## Define a Type-Safe Configuration Schema
**Rule:** Define a type-safe configuration schema.

### Example
```typescript
import { Config } from "effect";

const ServerConfig = Config.nested("SERVER")(
  Config.all({
    host: Config.string("HOST"),
    port: Config.number("PORT"),
  }),
);
```

**Explanation:**  
This schema ensures that both `host` and `port` are present and properly typed, and that their source is clearly defined.

## Provide Configuration to Your App via a Layer
**Rule:** Provide configuration to your app via a Layer.

### Example
````typescript
import { Config, Effect, Layer } from "effect";

const ServerConfig = Config.all({ port: Config.number("PORT") });

const program = Effect.log("Application starting...");

const configLayer = Config.layer(ServerConfig);

const runnable = Effect.provide(program, configLayer);
````

**Explanation:**  
This approach makes configuration available contextually, supporting better testing and modularity.