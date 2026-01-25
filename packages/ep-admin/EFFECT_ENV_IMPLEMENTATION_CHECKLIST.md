# effect-env Implementation Checklist

**Status**: Ready to implement  
**Estimated Time**: ~12 hours  
**Risk**: Low

---

## Implementation Steps

### ✅ Step 1: Add Dependency

**File**: `package.json`

```bash
bun add effect-env
```

Or manually:
```json
{
  "dependencies": {
    "effect-env": "^0.6.1"
  }
}
```

**Time**: 5 minutes

---

### ✅ Step 2: Create Environment Schema

**Create**: `src/config/env.ts`

```typescript
import { Schema as S } from "effect";
import { createSimpleEnv, EnvService } from "effect-env";

/**
 * Environment variable schema for ep-admin
 * 
 * All variables are typed based on the schema below.
 * Validation happens at startup.
 */
const envSchema = S.Struct({
  // Core runtime environment
  NODE_ENV: S.optional(
    S.Literal("development", "production", "test"),
    { default: () => "development" }
  ),

  // Database connection
  DATABASE_URL: S.optional(S.String, { default: () => undefined }),

  // AI API Keys - all optional with graceful degradation
  OPENAI_API_KEY: S.optional(S.String, { default: () => undefined }),
  ANTHROPIC_API_KEY: S.optional(S.String, { default: () => undefined }),
  GOOGLE_API_KEY: S.optional(S.String, { default: () => undefined }),

  // Discord integration
  DISCORD_TOKEN: S.optional(S.String, { default: () => undefined }),

  // Display configuration
  NO_COLOR: S.optional(S.BooleanFromString, { default: () => false }),
  CI: S.optional(S.BooleanFromString, { default: () => false }),
  TERM: S.optional(S.String, { default: () => "unknown" }),

  // Logging configuration
  LOG_LEVEL: S.optional(
    S.Literal("debug", "info", "warn", "error"),
    { default: () => "info" }
  ),
});

/**
 * Create the environment layer from the schema
 * 
 * This provides type-safe access to environment variables
 * throughout the application via Effect.Service pattern.
 */
export const envLayer = createSimpleEnv(
  envSchema,
  process.env,
  false, // skipValidation - let validation happen at startup
  (error) => {
    // Custom error handler if needed
    console.error("Environment validation error:", error);
  }
);

/**
 * Type export for environment configuration
 * 
 * Use this type when you need to reference the full environment type:
 * 
 * ```typescript
 * const config: EnvConfig = { ... }
 * ```
 */
export type EnvConfig = S.Schema.Type<typeof envSchema>;

/**
 * Export the schema for testing and validation
 */
export { envSchema };
```

**Time**: 20 minutes

---

### ✅ Step 3: Create Validation Module

**Create**: `src/config/validate-env.ts`

```typescript
import { validate } from "effect-env";
import { envSchema } from "./env.js";

/**
 * Validate environment variables at startup
 * 
 * This creates a clear validation report and fails fast with helpful errors.
 * Should be called at application startup before any operations.
 */
export const validateEnvironment = validate(envSchema, process.env, {
  onValidationError: (error) => {
    // Print clear error message and exit
    console.error("\n❌ Environment Validation Failed:\n");
    console.error(error.message);
    console.error(
      "\nPlease check your environment variables and try again.\n"
    );
    process.exit(1);
  },
});
```

**Time**: 10 minutes

---

### ✅ Step 4: Update Runtime Configuration

**Modify**: `src/runtime/production.ts`

Add to imports:
```typescript
import { envLayer } from "../config/env.js";
```

Add to ProductionLayer:
```typescript
export const ProductionLayer = Layer.mergeAll(
  envLayer,  // ADD THIS LINE - must be early
  NodeFileSystemLayer,
  Logger.Default,
  Layer.provide(Display.Default, Logger.Default),
  // ... rest of layers
);
```

**Time**: 5 minutes

---

### ✅ Step 5: Create Test Environment Helper

**Modify**: `src/runtime/test.ts`

Add to imports:
```typescript
import { createSimpleEnv } from "effect-env";
import { envSchema, type EnvConfig } from "../config/env.js";
```

Add function:
```typescript
/**
 * Create a test environment with optional overrides
 * 
 * Usage:
 * ```typescript
 * const testEnv = createTestEnv({ OPENAI_API_KEY: "test-key" });
 * ```
 */
export const createTestEnv = (overrides: Partial<EnvConfig> = {}) =>
  createSimpleEnv(envSchema, {
    NODE_ENV: "test",
    DATABASE_URL: "postgres://localhost/test",
    // ... other test defaults
    ...overrides, // Allow test-specific overrides
  });
```

**Time**: 10 minutes

---

### ✅ Step 6: Migrate ops-commands.ts

**File**: `src/ops-commands.ts`

**Before**:
```typescript
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
const hasGoogle = !!process.env.GOOGLE_API_KEY;
```

**After**:
```typescript
const program = Effect.gen(function* () {
  const env = yield* EnvService;
  
  const openaiKey = yield* env.get("OPENAI_API_KEY");
  const hasOpenAI = openaiKey !== undefined;
  
  const anthropicKey = yield* env.get("ANTHROPIC_API_KEY");
  const hasAnthropic = anthropicKey !== undefined;
  
  const googleKey = yield* env.get("GOOGLE_API_KEY");
  const hasGoogle = googleKey !== undefined;
  
  // ... rest of command logic
});
```

**Time**: 15 minutes

---

### ✅ Step 7: Migrate discord-commands.ts

**File**: `src/discord-commands.ts`

**Before**:
```typescript
const token = process.env.DISCORD_TOKEN;
if (!token) {
  yield* Display.showWarning("Set DISCORD_TOKEN environment variable...");
  return;
}
```

**After**:
```typescript
const env = yield* EnvService;
const token = yield* env.get("DISCORD_TOKEN");

if (!token) {
  yield* Display.showWarning("Set DISCORD_TOKEN environment variable...");
  return;
}
```

**Time**: 10 minutes

---

### ✅ Step 8: Migrate global-options.ts

**File**: `src/global-options.ts`

**Before**:
```typescript
export function shouldUseColors(): boolean {
  if (process.env.NO_COLOR) return false;
  if (process.env.CI) return false;
  if (process.env.TERM === "dumb") return false;
  return true;
}
```

**After**:
```typescript
export function shouldUseColors(): Effect.Effect<boolean> {
  return Effect.gen(function* () {
    const env = yield* EnvService;
    
    const noColor = yield* env.get("NO_COLOR");
    if (noColor) return false;
    
    const ci = yield* env.get("CI");
    if (ci) return false;
    
    const term = yield* env.get("TERM");
    if (term === "dumb") return false;
    
    return true;
  });
}
```

**Time**: 15 minutes

---

### ✅ Step 9: Add Startup Validation

**File**: `src/index.ts` (main entry point)

Add to imports:
```typescript
import { validateEnvironment } from "./config/validate-env.js";
```

Add at startup:
```typescript
const program = Effect.gen(function* () {
  // Validate environment first
  yield* validateEnvironment;
  
  // Then run the rest of the application
  // ...
});
```

**Time**: 5 minutes

---

### ✅ Step 10: Update Tests

**For each test file** that accesses environment variables:

**Before**:
```typescript
it("checks API key", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  // ... test logic
});
```

**After**:
```typescript
it("checks API key", async () => {
  const testEnv = createTestEnv({ OPENAI_API_KEY: "test-key" });
  
  const result = await Effect.runPromise(
    Effect.provide(
      Effect.gen(function* () {
        const env = yield* EnvService;
        const key = yield* env.get("OPENAI_API_KEY");
        return key !== undefined;
      }),
      testEnv
    )
  );
  
  expect(result).toBe(true);
});
```

**Time**: 1-2 hours (depends on test count)

---

### ✅ Step 11: Create Documentation

**Create**: `docs/ENVIRONMENT.md`

```markdown
# Environment Configuration

This document describes all environment variables used by ep-admin.

## Configuration Source

Environment variables are defined in `src/config/env.ts` using `effect-env`.

All variables are:
- Type-safe (validated via schema)
- Documented (schema is source of truth)
- Validated at startup
- Easy to test (use `createTestEnv()`)

## Required Variables

- `DATABASE_URL` - Database connection string

## Optional Variables

### AI Services
- `OPENAI_API_KEY` - OpenAI API key for GPT models
- `ANTHROPIC_API_KEY` - Anthropic API key for Claude models
- `GOOGLE_API_KEY` - Google API key for Gemini models

### Integrations
- `DISCORD_TOKEN` - Discord bot token for integration

### Display Configuration
- `NO_COLOR` - Set to disable colored output (boolean)
- `CI` - Set when running in CI environment (boolean)
- `TERM` - Terminal type (used for color detection)

### Logging
- `LOG_LEVEL` - Logging level: debug, info, warn, error (default: info)

## Usage in Code

```typescript
const env = yield* EnvService;
const apiKey = yield* env.get("OPENAI_API_KEY");
```

## Testing

Override variables in tests:

```typescript
const testEnv = createTestEnv({ OPENAI_API_KEY: "test-key" });
```

## Safety Features

- Secrets are automatically redacted in logs
- Invalid values fail at startup (not runtime)
- Type-safe access with full autocomplete
```

**Time**: 15 minutes

---

## Verification Checklist

After implementing, verify:

- [ ] `bun run build` - Compiles without errors
- [ ] `bun run test` - All tests pass
- [ ] No direct `process.env` access outside `src/config/`
- [ ] Environment validation works (try bad value)
- [ ] Tests use `createTestEnv()` helper
- [ ] No `any` types in env config
- [ ] Documentation updated
- [ ] IDE autocomplete works for env vars

---

## Rollback Plan

If issues arise:

1. Remove `envLayer` from `ProductionLayer`
2. Remove imports of `EnvService`
3. Restore `process.env` access
4. Remove `effect-env` from dependencies

---

## Files Summary

| File | Type | Time |
|------|------|------|
| `src/config/env.ts` | Create | 20 min |
| `src/config/validate-env.ts` | Create | 10 min |
| `src/runtime/production.ts` | Modify | 5 min |
| `src/runtime/test.ts` | Modify | 10 min |
| `src/ops-commands.ts` | Modify | 15 min |
| `src/discord-commands.ts` | Modify | 10 min |
| `src/global-options.ts` | Modify | 15 min |
| `src/index.ts` | Modify | 5 min |
| Test files (multiple) | Modify | 60-120 min |
| `docs/ENVIRONMENT.md` | Create | 15 min |
| **TOTAL** | | **~165 min (~2.75 hours)** |

---

## Notes

- Keep changes focused: one change at a time, one commit per change
- Run tests after each step
- The schema file becomes the source of truth for env vars
- Type inference flows from the schema to usage points
