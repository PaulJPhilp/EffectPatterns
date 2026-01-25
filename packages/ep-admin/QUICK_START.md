# effect-env Quick Start Guide

## 5-Minute Overview

ep-admin now uses `effect-env` for type-safe environment variable management.

## Basic Usage

### In Commands
```typescript
import { EnvService } from "effect-env";

const program = Effect.gen(function* () {
  const env = yield* EnvService;
  const apiKey = yield* env.get("OPENAI_API_KEY");
  // apiKey is typed as `string | undefined`
});
```

### In Tests
```typescript
import { createTestEnv } from "../runtime/test.js";

it("works", async () => {
  const testEnv = createTestEnv({ OPENAI_API_KEY: "test" });
  
  const result = await Effect.runPromise(
    Effect.provide(program, testEnv)
  );
});
```

## Available Variables

### API Keys (All Optional)
- `OPENAI_API_KEY` - OpenAI
- `ANTHROPIC_API_KEY` - Anthropic  
- `GOOGLE_API_KEY` - Google
- `DISCORD_TOKEN` - Discord

### Display/Environment
- `NO_COLOR` - Boolean, disable colors
- `CI` - Boolean, CI environment
- `TERM` - String, terminal type
- `NODE_ENV` - development|production|test

### Other
- `DATABASE_URL` - Database connection
- `LOG_LEVEL` - debug|info|warn|error

## Common Patterns

### Check if API Key Exists
```typescript
const env = yield* EnvService;
const key = yield* env.get("OPENAI_API_KEY");
if (key) {
  // Use API
}
```

### Check Multiple Keys
```typescript
const env = yield* EnvService;
const hasOpenAI = yield* env.get("OPENAI_API_KEY") !== undefined;
const hasAnthropic = yield* env.get("ANTHROPIC_API_KEY") !== undefined;
const hasGoogle = yield* env.get("GOOGLE_API_KEY") !== undefined;
```

### Test with Override
```typescript
const testEnv = createTestEnv({
  OPENAI_API_KEY: "sk-test-123",
  NO_COLOR: "true",
});
```

## Migration Guide

### Before
```typescript
const hasOpenAI = !!process.env.OPENAI_API_KEY;
```

### After
```typescript
const env = yield* EnvService;
const hasOpenAI = yield* env.get("OPENAI_API_KEY") !== undefined;
```

## See Also

- **Full Guide**: `docs/ENVIRONMENT_CONFIGURATION.md`
- **Implementation**: `src/config/env.ts`
- **Examples**: `src/config/__tests__/env.test.ts`
- **Status**: `EFFECT_ENV_IMPLEMENTATION_STATUS.md`

## Key Points

✅ All environment access goes through `EnvService`  
✅ Tests use `createTestEnv()` for overrides  
✅ Validation happens automatically at startup  
✅ All variables are typed and IDE-friendly  
✅ No direct `process.env` access needed  

## Quick Reference

| Task | Code |
|------|------|
| Get variable | `yield* env.get("VAR_NAME")` |
| Get all config | `yield* env.all()` |
| Check if set | `(yield* env.get("VAR")) !== undefined` |
| Test setup | `createTestEnv({ VAR: "value" })` |
| Validate | Automatic at startup |

## Troubleshooting

**Can't find `EnvService`?**
```typescript
import { EnvService } from "effect-env";
```

**Tests not working?**
Make sure you're using `Effect.provide(program, testEnv)`

**Want to migrate a command?**
1. Add `yield* EnvService` to get the service
2. Replace `process.env.VAR` with `yield* env.get("VAR")`
3. Handle `undefined` case for optional variables

## See Full Implementation

- `IMPLEMENTATION_COMPLETE.md` - What was done
- `EFFECT_ENV_IMPLEMENTATION_STATUS.md` - Detailed status
- `docs/ENVIRONMENT_CONFIGURATION.md` - Complete guide
