# Logger Service

Centralized logging service for `ep-cli`.

## Features

- **Multiple Levels**: Debug, info, warn, error, and success.
- **Configurable**: Log level, color support, and output format (text/JSON).
- **Icons**: Distinct icons for each log level.
- **Colorized**: Context-aware ANSI color support.

## Usage

```typescript
import { Logger } from "./services/logger/index.js";

const program = Effect.gen(function*() {
  const logger = yield* Logger;
  yield* logger.info("General information");
  yield* logger.error("Something went wrong");
});
```
