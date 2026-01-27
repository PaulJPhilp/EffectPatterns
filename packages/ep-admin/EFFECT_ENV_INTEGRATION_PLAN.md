# effect-env Integration Plan for ep-admin

**Test Integration**: effect-env from EffectTalk  
**Date**: 2026-01-23  
**Status**: Planning Phase

---

## Overview

Integrate **effect-env** (from EffectTalk) into ep-admin to replace scattered `process.env` access with:
- ✅ Type-safe environment variables
- ✅ Startup validation with clear errors
- ✅ Centralized configuration schema
- ✅ Easy testing with overrides
- ✅ Safe logging with redaction

---

## Current ep-admin Environment Usage

### Scattered Access Points

**ops-commands.ts** (Line ~XXX)
```typescript
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
const hasGoogle = !!process.env.GOOGLE_API_KEY;
```

**discord-commands.ts** (Line ~XXX)
```typescript
const token = process.env.DISCORD_TOKEN;
```

**global-options.ts** (Line ~XXX)
```typescript
if (process.env.NO_COLOR) return false;
if (process.env.CI) return false;
if (process.env.TERM === "dumb") return false;
```

### Current Problems
- No type safety (all `string | undefined`)
- No validation
- No defaults
- Hard to test
- Security: no redaction
- Documentation scattered

---

## effect-env API

### Main Functions

```typescript
// Simple schema-based env (no server/client split)
createSimpleEnv(
  schema: S.Schema<T>,
  runtimeEnv?: Record<string, string>,
  skipValidation?: boolean,
  onValidationError?: (error) => void
): Layer<Env<T>>

// Server/client separation (t3-env style)
createEnv({
  server: S.Schema<Server>,
  client: S.Schema<Client>,
  clientPrefix: "PUBLIC_",
  runtimeEnv?: Record<string, string>,
  skipValidation?: boolean,
  onValidationError?: (error) => void
}): Layer<Env<Server & Client>>
```

### EnvService Interface

```typescript
interface Env<E> {
  get<K extends keyof E>(key: K): Effect<E[K], EnvError>
  require<K extends keyof E>(key: K): Effect<NonNullable<E[K]>, MissingVarError>
  getNumber(key: string): Effect<number, EnvError>
  getBoolean(key: string): Effect<boolean, EnvError>
  getJson(key: string): Effect<unknown, EnvError>
  all(): Effect<E, never>
  withOverride<K>(key: K, value: string)(fa: Effect<A>): Effect<A>
}
```

### Utilities

```typescript
// Startup validation with clear error reporting
validate(schema: S.Schema<E>, source: Record<string, string | undefined>): Effect<void, ValidationError>

// Safe logging - redacts: key, token, secret, password, pwd, private, bearer, api, auth
redact(record: Record<string, string | undefined>, opts?: { extra?: [...patterns] }): Record<string, string | undefined>
```

---

## Integration Strategy

### Phase 1: Setup (1-2 hours)

**Step 1.1: Add dependency**
```bash
bun add effect-env
```

**Step 1.2: Create schema file** `src/config/env.ts`
```typescript
import { Schema as S } from "effect";
import { createSimpleEnv, EnvService } from "effect-env";

// Define all environment variables
const envSchema = S.Struct({
  // Node environment
  NODE_ENV: S.optional(
    S.Literal("development", "production", "test"),
    { default: () => "development" }
  ),

  // Database
  DATABASE_URL: S.optional(S.String, { default: () => undefined }),

  // AI API Keys (optional)
  OPENAI_API_KEY: S.optional(S.String, { default: () => undefined }),
  ANTHROPIC_API_KEY: S.optional(S.String, { default: () => undefined }),
  GOOGLE_API_KEY: S.optional(S.String, { default: () => undefined }),

  // Discord
  DISCORD_TOKEN: S.optional(S.String, { default: () => undefined }),

  // Display configuration
  NO_COLOR: S.optional(S.BooleanFromString, { default: () => false }),
  CI: S.optional(S.BooleanFromString, { default: () => false }),
  TERM: S.optional(S.String, { default: () => "unknown" }),

  // Logging
  LOG_LEVEL: S.optional(
    S.Literal("debug", "info", "warn", "error"),
    { default: () => "info" }
  ),
});

// Create the layer
export const envLayer = createSimpleEnv(envSchema, process.env);

// Type export for use elsewhere
export type EnvConfig = S.Schema.Type<typeof envSchema>;
```

### Phase 2: Runtime Integration (1 hour)

**Step 2.1: Update runtime** `src/runtime/production.ts`
```typescript
import { envLayer, type EnvConfig } from "../config/env.js";

export const ProductionLayer = Layer.mergeAll(
  envLayer,  // Add here
  NodeFileSystemLayer,
  Logger.Default,
  // ... other layers
);
```

**Step 2.2: Update test runtime** `src/runtime/test.ts`
```typescript
import { createSimpleEnv } from "effect-env";
import { envSchema } from "../config/env.js";

export const createTestEnv = (overrides: Partial<EnvConfig> = {}) =>
  createSimpleEnv(envSchema, {
    NODE_ENV: "test",
    // ... other defaults
    ...overrides,
  });
```

### Phase 3: Gradual Migration (6-8 hours)

**Step 3.1: Replace ops-commands.ts**
```typescript
// Before
const hasOpenAI = !!process.env.OPENAI_API_KEY;

// After
const program = Effect.gen(function* () {
  const env = yield* EnvService;
  const apiKey = yield* env.get("OPENAI_API_KEY");
  const hasOpenAI = apiKey !== undefined;
  // ...
});
```

**Step 3.2: Replace discord-commands.ts**
```typescript
// Before
const token = process.env.DISCORD_TOKEN;

// After
const program = Effect.gen(function* () {
  const env = yield* EnvService;
  const token = yield* env.get("DISCORD_TOKEN");
  if (!token) {
    // Handle missing token
    return;
  }
  // ...
});
```

**Step 3.3: Replace global-options.ts**
```typescript
// Before
if (process.env.NO_COLOR) return false;
if (process.env.CI) return false;

// After
const program = Effect.gen(function* () {
  const env = yield* EnvService;
  const noColor = yield* env.get("NO_COLOR");
  const ci = yield* env.get("CI");
  if (noColor || ci) return false;
  // ...
});
```

### Phase 4: Add Validation (1 hour)

**Step 4.1: Create validation** `src/config/validate-env.ts`
```typescript
import { validate } from "effect-env";
import { envSchema } from "./env.js";

export const validateEnvironment = validate(envSchema, process.env, {
  onValidationError: (error) => {
    console.error("Environment validation failed:");
    console.error(error.message);
    process.exit(1);
  }
});
```

**Step 4.2: Call at startup** `src/index.ts`
```typescript
import { validateEnvironment } from "./config/validate-env.js";

const program = Effect.gen(function* () {
  yield* validateEnvironment;
  // ... rest of app
});
```

### Phase 5: Tests Update (2-3 hours)

**Step 5.1: Update test setup**
```typescript
import { createTestEnv } from "src/runtime/test.js";

describe("ops-commands", () => {
  it("checks API keys", async () => {
    const program = Effect.gen(function* () {
      const env = yield* EnvService;
      const apiKey = yield* env.get("OPENAI_API_KEY");
      return apiKey !== undefined;
    });

    const testEnv = createTestEnv({
      OPENAI_API_KEY: "test-key",
    });

    const result = await Effect.runPromise(
      Effect.provide(program, testEnv)
    );
    expect(result).toBe(true);
  });
});
```

---

## Files to Create/Modify

### Create (New)
- `src/config/env.ts` - Environment schema and layer
- `src/config/validate-env.ts` - Startup validation
- `src/config/__tests__/env.test.ts` - Schema validation tests
- `docs/ENVIRONMENT.md` - Environment variable documentation

### Modify (Existing)
- `src/runtime/production.ts` - Add env layer
- `src/runtime/test.ts` - Add test env setup
- `src/ops-commands.ts` - Replace API key checks
- `src/discord-commands.ts` - Replace token access
- `src/global-options.ts` - Replace NO_COLOR/CI/TERM
- `package.json` - Add effect-env dependency
- All test files using env vars - Use test setup

---

## Code Examples

### Before & After Comparison

**Before**
```typescript
// Scattered, unsafe, untestable
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const noColor = !!process.env.NO_COLOR;
const ci = !!process.env.CI;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL required");
}
```

**After**
```typescript
// Centralized, type-safe, testable
const program = Effect.gen(function* () {
  const env = yield* EnvService;
  
  const openaiKey = yield* env.get("OPENAI_API_KEY");
  const hasOpenAI = openaiKey !== undefined;
  
  const noColor = yield* env.get("NO_COLOR");
  const ci = yield* env.get("CI");
  
  const dbUrl = yield* env.require("DATABASE_URL"); // Typed as string
  
  // All types are inferred from schema
  // All validation happens at startup
  // All tests can override values
});
```

---

## Benefits

### Immediate
✅ Type safety for all environment variables  
✅ Startup validation (fails fast with clear errors)  
✅ Centralized configuration schema  
✅ Easy testing with `withOverride()`  
✅ Safe logging with `redact()`  

### Long-term
✅ Foundation for other EffectTalk integration  
✅ Better IDE autocomplete for config  
✅ Self-documenting codebase (schema is source of truth)  
✅ Production-grade environment management  

---

## Testing Strategy

### Unit Tests
```typescript
describe("environment configuration", () => {
  it("validates schema", async () => {
    const env = createSimpleEnv(envSchema, {
      NODE_ENV: "test",
      // Required vars...
    });
    
    const result = await Effect.runPromise(
      Effect.provide(
        Effect.gen(function* () {
          const config = yield* EnvService;
          return yield* config.all();
        }),
        env
      )
    );
    
    expect(result.NODE_ENV).toBe("test");
  });

  it("fails on invalid values", async () => {
    // Invalid NODE_ENV value
    const env = createSimpleEnv(envSchema, {
      NODE_ENV: "invalid",
    });
    
    const result = await Effect.runPromise(
      Effect.provide(..., env)
    ).catch(e => e);
    
    expect(result).toBeInstanceOf(ValidationError);
  });
});
```

### Integration Tests
- Test with actual env vars
- Test validation failures
- Test redaction

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|-----------|
| Breaking existing code | Low | Gradual migration phase-by-phase |
| Type inference issues | Low | effect-env well-tested, schema-based |
| Performance impact | Very Low | Env vars loaded once at startup |
| Test setup complexity | Low | Clear test helpers provided |

---

## Success Criteria

- [ ] All env vars accessed through EnvService
- [ ] Zero direct `process.env` access outside of config/
- [ ] Startup validation implemented
- [ ] All tests passing with new setup
- [ ] Type coverage for all env vars
- [ ] Documentation created

---

## Timeline

| Phase | Duration | Effort |
|-------|----------|--------|
| Setup | 1-2 hrs | Schema definition |
| Runtime Integration | 1 hr | Layer updates |
| Gradual Migration | 6-8 hrs | Command file updates |
| Validation | 1 hr | Startup validation |
| Tests | 2-3 hrs | Test setup |
| **Total** | **~12 hours** | **Medium** |

---

## Next Steps

1. Review this plan
2. Create `src/config/env.ts` with initial schema
3. Update runtime configuration
4. Migrate one command at a time
5. Update tests as we go

---

## Resources

- [effect-env GitHub](https://github.com/PaulJPhilp/EffectTalk/tree/main/packages/effect-env)
- [effect-env npm](https://www.npmjs.com/package/effect-env)
- [EffectTalk Architecture](https://github.com/PaulJPhilp/EffectTalk)
