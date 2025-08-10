# Metrics Service

## Capabilities
- Records and exports metrics for CLI operations
- Integrates with telemetry/observability pipeline

## API
- See `api.ts` (`cli/src/services/metrics-service/api.ts`)
  - Interface: `MetricsServiceApi`
  - Refer to `types.ts` for metric types and identifiers

## Errors
- See `errors.ts` (`cli/src/services/metrics-service/errors.ts`)

## Usage
```ts
import { Effect } from "effect";
import { MetricsService } from "./service";

await Effect.runPromise(
  Effect.gen(function* () {
    const metrics = yield* MetricsService;
    // Use metrics APIs
  }).pipe(Effect.provide(MetricsService.Default))
);
```

## Testing
- Tests live in `__tests__/`
- Run via the repository test script (e.g., `pnpm test`)
