# Config Service

## Capabilities
- Loads and validates CLI configuration
- Provides typed access to configuration values for other services

## API
- See `api.ts` (`cli/src/services/config-service/api.ts`)
  - Interface: `ConfigServiceApi`
  - Refer to `types.ts` for shapes of returned configuration

## Errors
- See `errors.ts` (`cli/src/services/config-service/errors.ts`)
  - `ConfigError`: Raised when configuration is missing/invalid

## Usage
```ts
import { Effect } from "effect";
import { ConfigService } from "./service";

await Effect.runPromise(
  Effect.gen(function* () {
    const cfg = yield* ConfigService;
    // Read configuration via cfg
  }).pipe(Effect.provide(ConfigService.Default))
);
```

## Testing
- Tests live in `__tests__/`
- Run via the repository test script (e.g., `pnpm test`)
