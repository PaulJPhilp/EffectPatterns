# Linter Service

Service for linting Effect-based code and applying automated fixes.

## Features

- **Effect Patterns Rules**: Custom rules for Effect best practices (e.g., `effect-use-tap-error`).
- **Automated Fixes**: Ability to apply fixes for supported rules.
- **Colorized Results**: Richly formatted output using the central Logger.

## Usage

```typescript
import { Linter } from "./services/linter/index.js";

const program = Effect.gen(function*() {
  const linter = yield* Linter;
  const results = yield* linter.lintFiles(["src/index.ts"]);
  yield* linter.printResults(results);
});
```
