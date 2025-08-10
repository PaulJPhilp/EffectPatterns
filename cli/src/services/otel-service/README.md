# Otel Service

## Capabilities
- Provides OpenTelemetry tracing and context helpers
- Bridges CLI operations with tracing backends

## API
- See `api.ts` (`cli/src/services/otel-service/api.ts`)
  - Interface: `OtelServiceApi`

## Errors
- See `errors.ts` (`cli/src/services/otel-service/errors.ts`)

## Usage
```ts
import { Effect } from "effect";
import { OtelService } from "./service";

await Effect.runPromise(
  Effect.gen(function* () {
    const otel = yield* OtelService;
    // Use tracing helpers
  }).pipe(Effect.provide(OtelService.Default))
);
```

## Testing
- Tests live in `__tests__/`
- Run via the repository test script (e.g., `pnpm test`)
