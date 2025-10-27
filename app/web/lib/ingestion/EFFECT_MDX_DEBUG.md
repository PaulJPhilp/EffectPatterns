# effect-mdx Layer Composition Debug Guide

## Problem Statement

The `effect-mdx` package is not resolving its service dependencies correctly when used in the ingestion pipeline. TypeScript shows errors about `MdxServiceSchema` (the interface) being incompatible with `MdxService` (the service tag).

## Current Implementation

### Files Affected

1. **pattern-parser.ts** - Lines 41-62
2. **roadmap-parser.ts** - Lines 87-106
3. **pipeline.ts** - Lines 164-178

### What We're Trying to Do

```typescript
// In pattern-parser.ts
import { MdxService } from 'effect-mdx';

export const parsePatternFile = (
  filePath: string
): Effect.Effect<
  NewPattern,
  Error,
  FileSystem.FileSystem | Path.Path | MdxService  // ← Dependency
> =>
  Effect.gen(function* () {
    const mdx = yield* MdxService;  // ← Access service
    const parsed = yield* mdx.parseMdxFile(content);  // ← Use method
    // ...
  });
```

### Current Layer Provision (pipeline.ts)

```typescript
import { MdxServiceLive, defaultMdxConfigLayer } from 'effect-mdx';

export const runDefaultIngestion = (): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    yield* runIngestion(patternsDir, roadmapsDir);
  }).pipe(
    Effect.provide(
      Layer.mergeAll(
        NodeContext.layer,        // Provides FileSystem, Path, etc.
        defaultMdxConfigLayer,    // Provides MdxConfigServiceSchema
        MdxServiceLive            // Provides MdxService
      )
    )
  );
```

## TypeScript Errors

### Error 1: In pattern-parser.ts (Line 48)

```
Missing 'MdxServiceSchema' in the expected Effect context.

Type 'FileSystem | Path | MdxServiceSchema' is not assignable to type 'FileSystem | Path | MdxService'.
  Type 'MdxServiceSchema' is not assignable to type 'MdxService'.
    Property '_tag' is missing in type 'MdxServiceSchema' but required in type '{ readonly _tag: "MdxService"; }'.
```

**Analysis:**
- TypeScript is seeing `MdxServiceSchema` (the interface) instead of `MdxService` (the service tag)
- This suggests the service isn't being properly constructed or exported
- The `_tag` property is part of Effect's service identification system

### Error 2: In pipeline.ts (Line 165)

```
Missing 'FileSystem | MdxConfigServiceSchema' in the expected Effect context.

Type 'Effect<void, Error, FileSystem | MdxConfigServiceSchema>' is not assignable to type 'Effect<void, Error, never>'.
```

**Analysis:**
- The layer composition isn't fully satisfying the dependencies
- Either `FileSystem` or `MdxConfigServiceSchema` is still required but not provided
- This suggests `MdxServiceLive` might not be consuming the config layer correctly

## effect-mdx Package Structure

### From node_modules/effect-mdx/dist/service.d.ts

```typescript
export interface MdxServiceSchema {
  readonly readMdxAndFrontmatter: (filePath: string) => Effect.Effect<...>;
  readonly parseMdxFile: (content: string) => Effect.Effect<ParsedMdxAttributes, ...>;
  // ... other methods
}

export declare class MdxService extends Effect.Service.Class<
  MdxServiceSchema,
  "MdxService",
  {
    readonly effect: Effect.Effect<
      MdxServiceSchema,
      never,
      MdxConfigServiceSchema | FileSystem.FileSystem
    >;
  }
> {}

export declare const MdxServiceLive: Layer.Layer<
  MdxServiceSchema,
  never,
  MdxConfigServiceSchema | FileSystem.FileSystem
>;
```

**Key Observations:**
1. `MdxService` is an Effect.Service.Class
2. `MdxServiceLive` is a Layer that provides `MdxServiceSchema`
3. `MdxServiceLive` **requires** `MdxConfigServiceSchema | FileSystem.FileSystem`
4. The service tag is `"MdxService"` (string literal)

### From node_modules/effect-mdx/dist/config.d.ts

```typescript
export interface MdxConfigServiceSchema {
  readonly getConfig: () => MdxPipelineConfig;
}

export declare class MdxConfigService extends Effect.Service.Class<
  MdxConfigServiceSchema,
  "MdxConfigService",
  {
    readonly succeed: {
      readonly getConfig: () => MdxPipelineConfig;
    };
  }
> {}

export declare const defaultMdxConfigLayer: Layer.Layer<
  MdxConfigServiceSchema,
  never,
  never
>;
```

## Hypothesis: Why It's Failing

### Theory 1: Service Tag vs Interface Confusion

The type system is confusing:
- `MdxService` (the service class/tag) 
- `MdxServiceSchema` (the interface)

When we write `yield* MdxService`, we should be accessing the service by its tag, but TypeScript might be resolving to the interface instead.

### Theory 2: Layer Composition Order

The order of `Layer.mergeAll` might matter:

```typescript
// Current (might be wrong)
Layer.mergeAll(
  NodeContext.layer,        // Provides FileSystem
  defaultMdxConfigLayer,    // Provides MdxConfigServiceSchema
  MdxServiceLive            // Requires both above
)

// Possible fix: Explicit composition
Layer.provide(
  MdxServiceLive,
  Layer.mergeAll(NodeContext.layer, defaultMdxConfigLayer)
)
```

### Theory 3: Service Access Pattern

Maybe we need to access the service differently:

```typescript
// Current
const mdx = yield* MdxService;

// Alternative 1: Direct method access
const parsed = yield* MdxService.parseMdxFile(content);

// Alternative 2: Use the schema interface
const mdx = yield* Effect.service(MdxService);
```

## Debugging Steps

### Step 1: Verify effect-mdx Version

```bash
cd app/web
bun pm ls effect-mdx
```

Check if we're on the latest version. The package might have had breaking changes.

### Step 2: Check effect Version Compatibility

```bash
bun pm ls effect
```

Ensure `effect-mdx` is compatible with our `effect@3.18.4`.

### Step 3: Test Minimal Example

Create a test file to isolate the issue:

```typescript
// app/web/lib/ingestion/test-mdx.ts
import { Effect, Layer } from 'effect';
import { NodeContext } from '@effect/platform-node';
import { FileSystem } from '@effect/platform';
import { MdxService, MdxServiceLive, defaultMdxConfigLayer } from 'effect-mdx';

const testProgram = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const mdx = yield* MdxService;
  
  const content = yield* fs.readFileString('test.mdx');
  const parsed = yield* mdx.parseMdxFile(content);
  
  console.log(parsed);
});

const runTest = testProgram.pipe(
  Effect.provide(
    Layer.mergeAll(
      NodeContext.layer,
      defaultMdxConfigLayer,
      MdxServiceLive
    )
  )
);

Effect.runPromise(runTest);
```

Run: `bun run app/web/lib/ingestion/test-mdx.ts`

### Step 4: Try Alternative Layer Composition

```typescript
// Option A: Explicit provide
const appLayer = Layer.provide(
  MdxServiceLive,
  Layer.mergeAll(NodeContext.layer, defaultMdxConfigLayer)
);

// Option B: Sequential composition
const appLayer = NodeContext.layer.pipe(
  Layer.merge(defaultMdxConfigLayer),
  Layer.provideTo(MdxServiceLive)
);

// Option C: Use Layer.provide directly
const appLayer = MdxServiceLive.pipe(
  Layer.provide(defaultMdxConfigLayer),
  Layer.provide(NodeContext.layer)
);
```

### Step 5: Check Service Export

Verify the service is exported correctly:

```typescript
// Check what MdxService actually is
console.log(MdxService);
console.log(MdxService.key);  // Should be "MdxService"
console.log(typeof MdxService);
```

### Step 6: Try Using Context.Tag Directly

```typescript
import { Context } from 'effect';

// Maybe we need to create our own tag?
const MdxServiceTag = Context.GenericTag<MdxServiceSchema>('MdxService');

const mdx = yield* MdxServiceTag;
```

## Potential Solutions

### Solution 1: Update effect-mdx

```bash
cd app/web
bun update effect-mdx
```

### Solution 2: Fix Type Annotations

Change the return type to use the schema interface:

```typescript
import type { MdxServiceSchema } from 'effect-mdx';

export const parsePatternFile = (
  filePath: string
): Effect.Effect<
  NewPattern,
  Error,
  FileSystem.FileSystem | Path.Path | MdxServiceSchema  // ← Use interface
> =>
```

### Solution 3: Use Different Service Access

```typescript
// Instead of storing in variable
const mdx = yield* MdxService;
const parsed = yield* mdx.parseMdxFile(content);

// Access directly
const parsed = yield* Effect.flatMap(
  MdxService,
  (mdx) => mdx.parseMdxFile(content)
);
```

### Solution 4: Provide Layer at Call Site

Instead of providing at the top level, provide where needed:

```typescript
const parsed = yield* mdx.parseMdxFile(content).pipe(
  Effect.provide(MdxServiceLive),
  Effect.provide(defaultMdxConfigLayer)
);
```

## Expected Behavior

Once fixed, this should work:

```typescript
const parsed = yield* mdx.parseMdxFile(content);
// parsed.attributes = { title: "...", id: "...", ... }
// parsed.body = "# Pattern content..."
```

## Files to Check

1. `/app/web/lib/ingestion/pattern-parser.ts` - Lines 10, 46, 51, 57
2. `/app/web/lib/ingestion/roadmap-parser.ts` - Lines 9, 93, 97, 103
3. `/app/web/lib/ingestion/pipeline.ts` - Lines 9, 172-176
4. `/node_modules/effect-mdx/dist/service.d.ts` - Service definition
5. `/node_modules/effect-mdx/dist/config.d.ts` - Config layer definition

## Success Criteria

When fixed, you should be able to:
1. ✅ No TypeScript errors in the three parser files
2. ✅ Run `bun run ingest:patterns` without runtime errors
3. ✅ Parse MDX frontmatter successfully
4. ✅ Extract pattern metadata into database

## Additional Context

- We're using Bun, not Node.js
- Effect version: 3.18.4
- effect-mdx version: 0.2.2 (check with `bun pm ls`)
- We only need `parseMdxFile` method, not the full compilation pipeline
- The parsed result should have `attributes` (frontmatter) and `body` (content)

## If All Else Fails

Fall back to gray-matter:

```typescript
import matter from 'gray-matter';

const parsed = matter(content);
// parsed.data = frontmatter object
// parsed.content = markdown body
```

This is simpler and we can wrap it in Effect ourselves.
