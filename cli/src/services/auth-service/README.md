# Auth Service

## Capabilities
- Provides authentication configuration and helpers for CLI commands
- Centralizes reading and validating auth-related settings

## API
- See `api.ts` (`cli/src/services/auth-service/api.ts`)
  - Exposes the `AuthApi` service API
  - Refer to `types.ts` for request/response types

## Errors
- See `errors.ts` (`cli/src/services/auth-service/errors.ts`)
  - `AuthError`: Raised when authentication configuration or
    token-related operations fail

## Usage
```ts
import { Effect } from "effect";
import { AuthApi } from "./api";

await Effect.runPromise(
  Effect.gen(function* () {
    const auth = yield* AuthApi;
    // Use auth APIs here
  }).pipe(Effect.provide(AuthApi.Default))
);
```

## Testing
- Tests live in `__tests__/`
- Run via the repository test script (e.g., `pnpm test`)
