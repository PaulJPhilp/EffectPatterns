# Environment Configuration with effect-env

This document describes the environment variable configuration system for ep-admin using `effect-env` from EffectTalk.

## Overview

ep-admin uses `effect-env` to provide:
- ✅ Type-safe environment variable access
- ✅ Startup validation with clear error messages
- ✅ Centralized schema definition
- ✅ Easy testing with environment overrides
- ✅ Automatic secret redaction in logs

## Architecture

### Configuration Schema

All environment variables are defined in `src/config/env.ts`:

```typescript
const envSchema = S.Struct({
  NODE_ENV: S.optional(S.Literal("development", "production", "test")),
  DATABASE_URL: S.optional(S.String),
  OPENAI_API_KEY: S.optional(S.String),
  ANTHROPIC_API_KEY: S.optional(S.String),
  GOOGLE_API_KEY: S.optional(S.String),
  DISCORD_TOKEN: S.optional(S.String),
  NO_COLOR: S.optional(S.BooleanFromString),
  CI: S.optional(S.BooleanFromString),
  TERM: S.optional(S.String),
  LOG_LEVEL: S.optional(S.Literal("debug", "info", "warn", "error")),
});
```

### Runtime Layer

The environment layer is provided in `ProductionLayer`:

```typescript
export const ProductionLayer = Layer.mergeAll(
  envLayer,  // Environment configuration (first)
  // ... other layers
);
```

### Validation

Environment is validated at application startup in `src/index.ts`:

```typescript
const program = Effect.gen(function* () {
  yield* validateEnvironment;  // Validates at startup
  yield* createAdminProgram(process.argv);
});
```

## Environment Variables

### Required

None - all variables are optional for graceful degradation.

### Optional

#### Core Runtime
- `NODE_ENV` - Application environment (development, production, test)
- `DATABASE_URL` - Database connection string

#### AI Services
- `OPENAI_API_KEY` - OpenAI API key for GPT models
- `ANTHROPIC_API_KEY` - Anthropic API key for Claude models
- `GOOGLE_API_KEY` - Google API key for Gemini models

#### Integrations
- `DISCORD_TOKEN` - Discord bot token for integration

#### Display Configuration
- `NO_COLOR` - Disable colored output (boolean)
- `CI` - Running in CI environment (boolean)
- `TERM` - Terminal type (e.g., "dumb" for no colors)

#### Logging
- `LOG_LEVEL` - Logging verbosity (debug, info, warn, error)

## Usage in Code

### Accessing Environment Variables

```typescript
import { EnvService } from "effect-env";

const program = Effect.gen(function* () {
  const env = yield* EnvService;
  
  // Get optional variable
  const apiKey = yield* env.get("OPENAI_API_KEY");
  const hasOpenAI = apiKey !== undefined;
  
  // Get all variables
  const allConfig = yield* env.all();
  console.log(allConfig.NODE_ENV);
});
```

### Type Safety

Variable names and types are inferred from the schema:

```typescript
const env = yield* EnvService;

// Full type inference
const key = yield* env.get("OPENAI_API_KEY");
// key is `string | undefined`

const term = yield* env.get("TERM");
// term is `string | undefined`

const ci = yield* env.get("CI");
// ci is `boolean | undefined`
```

## Testing

### Using Test Environment

```typescript
import { createTestEnv } from "../runtime/test.js";
import { EnvService } from "effect-env";

describe("my feature", () => {
  it("works with OPENAI_API_KEY", async () => {
    const testEnv = createTestEnv({
      OPENAI_API_KEY: "test-key-123",
    });

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
});
```

### Test Environment Defaults

`createTestEnv()` provides:
- `NODE_ENV`: "test"
- All other variables: `undefined`

Override any variable:

```typescript
createTestEnv({
  NO_COLOR: "true",
  CI: "1",
  LOG_LEVEL: "debug",
});
```

## Migrating Existing Code

### Before (Direct access)
```typescript
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const noColor = !!process.env.NO_COLOR;
```

### After (Using EnvService)
```typescript
const env = yield* EnvService;
const openaiKey = yield* env.get("OPENAI_API_KEY");
const hasOpenAI = openaiKey !== undefined;

const noColor = yield* env.get("NO_COLOR");
```

## Error Handling

### Validation Errors

If environment validation fails at startup:

```
❌ Environment Validation Failed:

Invalid values detected...

Please check your environment variables and try again.
```

The application exits with code 1.

### Runtime Access

If a required variable is missing:

```typescript
const env = yield* EnvService;
const required = yield* env.require("REQUIRED_VAR");
// Fails if REQUIRED_VAR is not set
```

## Security Features

### Automatic Secret Redaction

effect-env automatically redacts sensitive variable names:
- `key`, `token`, `secret`, `password`, `pwd`, `private`, `bearer`, `api`, `auth`

When logging environment values, use:

```typescript
import { redact } from "effect-env";

const safeToPrint = redact(process.env);
console.log(safeToPrint);
// OPENAI_API_KEY will be redacted
```

## Best Practices

### 1. Define Schema Once
Keep environment schema in `src/config/env.ts` - it's the single source of truth.

### 2. Use EnvService in Commands
Access environment through `EnvService` for type safety and testability.

### 3. Override in Tests
Use `createTestEnv()` to override variables in tests, not `process.env`.

### 4. Validate Early
Validation runs at startup via `validateEnvironment` - failing fast prevents runtime errors.

### 5. Document Optional Behavior
When accessing optional variables, handle the `undefined` case:

```typescript
const key = yield* env.get("OPENAI_API_KEY");
if (!key) {
  // Handle missing key gracefully
  yield* Display.showWarning("Set OPENAI_API_KEY for AI features");
  return;
}
```

## Examples

### Checking API Key Availability

```typescript
const env = yield* EnvService;
const openaiKey = yield* env.get("OPENAI_API_KEY");
const anthropicKey = yield* env.get("ANTHROPIC_API_KEY");
const googleKey = yield* env.get("GOOGLE_API_KEY");

const hasOpenAI = openaiKey !== undefined;
const hasAnthropic = anthropicKey !== undefined;
const hasGoogle = googleKey !== undefined;

yield* Display.showInfo(`OpenAI: ${hasOpenAI ? "✓" : "✗"}`);
yield* Display.showInfo(`Anthropic: ${hasAnthropic ? "✓" : "✗"}`);
yield* Display.showInfo(`Google: ${hasGoogle ? "✓" : "✗"}`);
```

### Checking Color Support

```typescript
const env = yield* EnvService;
const noColor = yield* env.get("NO_COLOR");
const ci = yield* env.get("CI");
const term = yield* env.get("TERM");

const shouldUseColors = 
  !noColor && 
  !ci && 
  term !== "dumb" && 
  process.stdout.isTTY;
```

### Discord Integration Check

```typescript
const env = yield* EnvService;
const token = yield* env.get("DISCORD_TOKEN");

if (!token) {
  yield* Display.showWarning("Discord token not found");
  yield* Display.showInfo("Set DISCORD_TOKEN to enable Discord integration");
  return;
}

// Proceed with Discord integration
```

## Resources

- [effect-env Documentation](https://www.npmjs.com/package/effect-env)
- [Effect-TS Schema Documentation](https://effect.website/docs/guides/schema)
- [EffectTalk GitHub](https://github.com/PaulJPhilp/EffectTalk)

## Troubleshooting

### Type Not Found: "EnvService"
Ensure you've imported from effect-env:
```typescript
import { EnvService } from "effect-env";
```

### Variable Not Available in Layer
The `envLayer` must be included in your layer composition. Check that `ProductionLayer` includes `envLayer`.

### Test Variable Overrides Not Working
Make sure you're using `createTestEnv()` and providing it via `Effect.provide()`:

```typescript
const testEnv = createTestEnv({ VAR: "value" });
Effect.runPromise(Effect.provide(program, testEnv));
```

### Validation Error at Startup
Check your actual environment variables match the schema. All optional variables default to `undefined` if not set.
