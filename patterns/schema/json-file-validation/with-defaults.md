---
id: schema-json-file-with-defaults
title: Schema with Default Values
category: json-file-validation
skill: intermediate
tags:
  - schema
  - json
  - file
  - defaults
  - optional
---

# Problem

Configuration files often have optional fields where users can omit them and use sensible defaults. Manually checking if a field exists and assigning defaults is repetitive and error-prone. You need schemas to automatically fill in missing optional fields with defaults at parse time, so the resulting object always has complete data without runtime null-checks.

# Solution

```typescript
import { Schema, Effect } from "effect";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";

// 1. Define schema with default values using pipe
const ServerConfig = Schema.Struct({
  // Required fields
  host: Schema.String.pipe(Schema.minLength(1)),
  port: Schema.Number.pipe(Schema.int(), Schema.between(1, 65535)),

  // Optional fields with defaults applied at parse time
  timeout: Schema.Number.pipe(
    Schema.int(),
    Schema.positive(),
    Schema.optionalWith({ default: () => 5000 }) // 5 second default
  ),
  maxRetries: Schema.Number.pipe(
    Schema.int(),
    Schema.between(0, 10),
    Schema.optionalWith({ default: () => 3 })
  ),
  enableSSL: Schema.Boolean.pipe(
    Schema.optionalWith({ default: () => false })
  ),
  compressionLevel: Schema.Number.pipe(
    Schema.int(),
    Schema.between(0, 9),
    Schema.optionalWith({ default: () => 6 }) // Mid-range compression
  ),
});

type ServerConfig = typeof ServerConfig.Type;

// 2. Load config with defaults automatically applied
const loadServerConfig = (filePath: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    const content = yield* fs.readFileString(filePath).pipe(
      Effect.mapError((error) => ({
        _tag: "ReadError" as const,
        message: `Cannot read config: ${error.message}`,
      }))
    );

    let jsonData: unknown;
    try {
      jsonData = JSON.parse(content);
    } catch (error) {
      return yield* Effect.fail({
        _tag: "ParseError" as const,
        message: `Invalid JSON: ${String(error)}`,
      });
    }

    // Decode with defaults applied automatically
    const config = yield* Schema.decodeUnknown(ServerConfig)(
      jsonData
    ).pipe(
      Effect.mapError((error) => ({
        _tag: "ValidationError" as const,
        message: `Invalid config: ${error.message}`,
      }))
    );

    return config;
  });

// 3. Demonstrate defaults in action
const displayConfig = (config: ServerConfig) =>
  Effect.sync(() => {
    console.log("📡 Server Configuration:");
    console.log(`  Host: ${config.host}`);
    console.log(`  Port: ${config.port}`);
    console.log(
      `  Timeout: ${config.timeout}ms (default if omitted)`
    );
    console.log(
      `  Max Retries: ${config.maxRetries} (default if omitted)`
    );
    console.log(
      `  SSL Enabled: ${config.enableSSL} (default if omitted)`
    );
    console.log(
      `  Compression: ${config.compressionLevel}/9 (default if omitted)`
    );
  });

// 4. Type-safe config with guaranteed properties
const initServer = (config: ServerConfig) =>
  Effect.sync(() => {
    // These are guaranteed to exist; no undefined checks needed
    const url = `${config.enableSSL ? "https" : "http"}://${config.host}:${config.port}`;

    console.log(`✅ Starting server at ${url}`);
    console.log(`   Timeout: ${config.timeout}ms`);
    console.log(`   Retries: ${config.maxRetries}`);
    console.log(`   Compression: level ${config.compressionLevel}`);
  });

// 5. Usage
Effect.runPromise(
  Effect.gen(function* () {
    const config = yield* loadServerConfig("./server-config.json");
    yield* displayConfig(config);
    yield* initServer(config);
  }).pipe(Effect.provideLayer(NodeFileSystem.layer))
)
  .catch((error) => {
    console.error(`❌ ${error._tag}: ${error.message}`);
    process.exit(1);
  });

// Example configs:
// Minimal (uses all defaults):
// {
//   "host": "localhost",
//   "port": 8080
// }
//
// Full (explicit values):
// {
//   "host": "api.example.com",
//   "port": 443,
//   "timeout": 10000,
//   "maxRetries": 5,
//   "enableSSL": true,
//   "compressionLevel": 9
// }
//
// Both produce complete config objects with no undefined fields
```

# Why This Works

| Concept | Explanation |
|---------|-------------|
| `Schema.optionalWith({ default: () => value })` | Applies default when field is missing |
| Default factory function `() => value` | Computed at parse time (not shared mutable state) |
| Type becomes non-optional | TypeScript knows field always exists |
| Eliminates null/undefined checks | Config properties guaranteed to exist |
| Schema composition | Defaults applied during decode, not manually afterward |
| Single source of truth | Defaults live in schema definition |
| Type-safe defaults | Cannot provide wrong type for default |

# When to Use

- Configuration files with many optional fields
- Avoiding manual `config.timeout ?? 5000` checks everywhere
- Setting sensible defaults that always apply
- When you want guaranteed non-null config properties
- Server applications with timeout, retry, and feature flags
- Database connection strings with default pools and timeouts
- API clients with default headers and retry strategies
- Making config object safe to use without runtime checks

# Related Patterns

- [Basic JSON File Validation](./basic.md)
- [Validating Config Files](./config-files.md)
- [Validating Multiple Config Files](./multiple-files.md)
- [Basic Form Validation](../form-validation/basic.md)
