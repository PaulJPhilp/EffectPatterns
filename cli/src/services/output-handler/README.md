# Output Handler Service

## Capabilities
- Writes CLI outputs to stdout or files
- Supports quiet mode, overwrite control, and formatting

## API
- See `api.ts` (`cli/src/services/output-handler/api.ts`)
  - Interface: `OutputHandlerServiceApi`

## Errors
- See `errors.ts` (`cli/src/services/output-handler/errors.ts`)
  - `OutputHandlerError`: Wraps output write failures

## Usage
```ts
import { Effect } from "effect";
import { OutputHandlerService } from "./service";

await Effect.runPromise(
  Effect.gen(function* () {
    const out = yield* OutputHandlerService;
    // out.write(...)
  }).pipe(Effect.provide(OutputHandlerService.Default))
);
```

## Testing
- Tests live in `__tests__/`
- Run via the repository test script (e.g., `pnpm test`)
