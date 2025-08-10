# LLM Service

## Capabilities
- Orchestrates provider-agnostic LLM interactions for CLI commands
- Supports structured and unstructured outputs
- Integrates with prompt templates and MDX sources

## API
- See `api.ts` (`cli/src/services/llm-service/api.ts`)
  - Interface: `LLMServiceApi`
  - Refer to `types.ts` for request/response types and enums

## Errors
- See `errors.ts` (`cli/src/services/llm-service/errors.ts`)
  - `InvalidMdxFormatError`, `InvalidFrontmatterError`
  - `UnsupportedProviderError`, `InvalidJsonResponseError`
  - `FileReadError`, `LlmServiceError`, `RateLimitError`, `QuotaExceededError`

## Usage
```ts
import { Effect, Layer } from "effect";
import { LLMService } from "./service";

await Effect.runPromise(
  Effect.gen(function* () {
    const llm = yield* LLMService;
    // Call llm methods (e.g., process prompt)
  }).pipe(Effect.provide(Layer.mergeAll(
    LLMService.Default
  )))
);
```

## Testing
- Tests live in `__tests__/`
- Run via the repository test script (e.g., `pnpm test`)
