# Run Service

## Capabilities
- Creates and tracks current run context for command executions
- Provides helpers for run directories and files

## API
- See `api.ts` (`cli/src/services/run-service/api.ts`)
  - Functions: `createRun`, `getRunPath`, `getRunFilePath`,
    `getCurrentRun`, `setCurrentRun`, `clearCurrentRun`
  - Refer to `types.ts` for `RunInfo` and related data

## Errors
- See `errors.ts` (`cli/src/services/run-service/errors.ts`)
  - `NoActiveRunError`: When no current run is set

## Usage
```ts
import { Effect } from "effect";
import { RunService } from "./service";

await Effect.runPromise(
  Effect.gen(function* () {
    const run = yield* RunService;
    // run.* helpers
  }).pipe(Effect.provide(RunService.Default))
);
```

## Testing
- Tests live in `__tests__/`
- Run via the repository test script (e.g., `pnpm test`)
