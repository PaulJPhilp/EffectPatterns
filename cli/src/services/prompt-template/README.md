# Prompt Template Service

## Capabilities
- Loads and validates MDX prompt templates with frontmatter
- Renders templates with parameter validation and defaults

## API
- See `api.ts` (`cli/src/services/prompt-template/api.ts`)
  - Interface: `TemplateServiceApi`
  - Refer to `types.ts` for template parameter types

## Errors
- See `errors.ts` (`cli/src/services/prompt-template/errors.ts`)
  - `UnsupportedTemplateFileError`, `InvalidParameterTypeError`
  - `MissingParametersError`, `UnknownParametersError`, `TemplateRenderError`

## Usage
```ts
import { Effect } from "effect";
import { TemplateService } from "./service";

await Effect.runPromise(
  Effect.gen(function* () {
    const tmpl = yield* TemplateService;
    // tmpl.loadTemplate / tmpl.renderTemplate
  }).pipe(Effect.provide(TemplateService.Default))
);
```

## Testing
- Tests live in `__tests__/`
- Run via the repository test script (e.g., `pnpm test`)
