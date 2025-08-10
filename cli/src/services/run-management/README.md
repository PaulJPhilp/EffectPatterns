# Run Management Service

## Capabilities
- Manages run lifecycle and metadata for CLI sessions
- Provides helpers to read/write run state

## API
- See `api.ts` (`cli/src/services/run-management/api.ts`)
  - Interface: `RunManagementApi`
  - Refer to `types.ts` for run-related types

## Errors
- See `errors.ts` (`cli/src/services/run-management/errors.ts`)
  - `RunManagementError`: Wraps run management failures

## Usage
```ts
import { Effect } from "effect";
import { RunManagement } from "./service";

await Effect.runPromise(
  Effect.gen(function* () {
    const mgr = yield* RunManagement;
    // mgr.*
  }).pipe(Effect.provide(RunManagement.Default))
);
```

## Testing
- Tests live in `__tests__/`
- Run via the repository test script (e.g., `pnpm test`)
