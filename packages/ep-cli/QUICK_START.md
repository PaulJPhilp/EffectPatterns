# effect-env Quick Start - ep-cli

## 5-Minute Overview

ep-cli now uses `effect-env` for type-safe environment variable management.

## Available Environment Variables

### Logging (All Optional)
- `LOG_LEVEL` - debug|info|warn|error
- `DEBUG` - Enable debug logging (boolean)
- `VERBOSE` - Enable verbose output (boolean)

### Runtime
- `NODE_ENV` - development|production|test

### Display
- `NO_COLOR` - Disable colors (boolean)
- `CI` - CI environment flag (boolean)
- `TERM` - Terminal type (string)

## Usage

### Current (Logger Setup)
```bash
LOG_LEVEL=debug ep command
DEBUG=1 ep command
VERBOSE=1 ep command
```

### Future (In Commands)
```typescript
import { EnvService } from "effect-env";

const env = yield* EnvService;
const logLevel = yield* env.get("LOG_LEVEL");
```

### Testing
```typescript
import { createTestEnv } from "../runtime/test.js";

const testEnv = createTestEnv({ LOG_LEVEL: "debug" });
```

## Common Patterns

### Enable Debug Logging
```bash
DEBUG=1 ep search pattern
# or
LOG_LEVEL=debug ep search pattern
```

### Disable Colors in CI
```bash
CI=1 ep list
# or
NO_COLOR=1 ep list
```

### Combined
```bash
LOG_LEVEL=debug NO_COLOR=1 ep search effect
```

## Key Points

✅ All variables are type-safe  
✅ Validation happens automatically  
✅ Logger config resolved from env vars  
✅ Can override in tests with createTestEnv()  
✅ Ready for gradual migration to EnvService  

## Environment Variables

| Variable | Type | Default | Notes |
|----------|------|---------|-------|
| LOG_LEVEL | string | info | debug, info, warn, error |
| DEBUG | boolean | false | Enables debug logging |
| VERBOSE | boolean | false | Enables verbose output |
| NODE_ENV | string | development | development, production, test |
| NO_COLOR | boolean | false | Disables colored output |
| CI | boolean | false | CI environment indicator |
| TERM | string | undefined | Terminal type |

## Examples

```bash
# Debug mode
LOG_LEVEL=debug ep search effect

# Verbose with no colors
VERBOSE=1 NO_COLOR=1 ep list patterns

# In CI
CI=1 ep search effect

# Development debugging
DEBUG=1 VERBOSE=1 ep install @effect-patterns/toolkit
```

## See Also

- **Full Documentation**: `EFFECT_ENV_IMPLEMENTATION_STATUS.md`
- **Config**: `src/config/env.ts`
- **Test Helper**: `src/runtime/test.ts`

## Troubleshooting

**Logger not in debug mode?**
```bash
# Use one of these:
LOG_LEVEL=debug ep ...
DEBUG=1 ep ...
VERBOSE=1 ep ...
```

**Colors not working in CI?**
Use `NO_COLOR=1` or `CI=1` to disable colors automatically.

**Want to use EnvService in a command?**
1. Import: `import { EnvService } from "effect-env"`
2. Yield: `const env = yield* EnvService`
3. Get: `const value = yield* env.get("VAR_NAME")`

## Quick Reference

Priority for logger: `LOG_LEVEL` > `DEBUG` > `VERBOSE` > default (info)
