# Fix Needed for effect-mdx

## Issue
The `MdxService` has a mismatch between what dependencies the `scoped` Effect requires and what's declared in the `dependencies` array.

## Current Code (in effect-mdx/src/service.ts)

```typescript
export class MdxService extends Effect.Service()("MdxService", {
    scoped: Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;  // ← Requires FileSystem
        const defaultCfg = {...};
        const cfgSvc = yield* MdxConfigService;   // ← Requires MdxConfigService
        
        // ... implementation
        
        return {
            readMdxAndFrontmatter,
            updateMdxContent,
            // ... other methods
        };
    }),
    dependencies: [],  // ❌ WRONG! Should list the dependencies above
}) {}
```

## Fixed Code

```typescript
export class MdxService extends Effect.Service()("MdxService", {
    scoped: Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const defaultCfg = {...};
        const cfgSvc = yield* MdxConfigService;
        
        // ... implementation
        
        return {
            readMdxAndFrontmatter,
            updateMdxContent,
            // ... other methods
        };
    }),
    dependencies: [FileSystem.FileSystem, MdxConfigService],  // ✅ CORRECT!
}) {}
```

## Why This Matters

When Effect sees `dependencies: []`, it doesn't know to automatically provide `FileSystem.FileSystem` and `MdxConfigService` to the scoped Effect. This causes the runtime to try to execute an Effect with missing dependencies, resulting in "Not a valid effect: undefined".

By properly declaring the dependencies, Effect's layer system can:
1. Automatically wire up the dependencies
2. Provide proper type checking
3. Generate a correct `.Default` layer

## Alternative Fix (If you want zero external dependencies)

If you want `MdxConfigService` to be optional, you could structure it like this:

```typescript
export class MdxService extends Effect.Service()("MdxService", {
    scoped: Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        
        // Get config with a fallback
        const cfgSvc = yield* MdxConfigService.pipe(
            Effect.catchTag("NoSuchElement", () => 
                Effect.succeed({
                    getConfig: () => defaultConfig
                })
            )
        );
        
        // ... implementation
    }),
    dependencies: [FileSystem.FileSystem],  // Only required dependency
}) {}
```

## Testing the Fix

After making this change, rebuild effect-mdx and test with:

```typescript
import { Effect, Layer } from "effect";
import { NodeContext } from "@effect/platform-node";
import { MdxService, MdxConfigService } from "effect-mdx";

const program = Effect.gen(function* () {
    const mdx = yield* MdxService;
    const result = yield* mdx.readMdxAndFrontmatter("./test.mdx");
    console.log(result.frontmatter);
});

// Should work with simple composition
const layers = Layer.mergeAll(
    NodeContext.layer,
    MdxConfigService.Default,
    MdxService.Default
);

Effect.runPromise(Effect.provide(program, layers));
```

## Version Compatibility

Also note that the peer dependencies might need updating:
- Current: `@effect/platform-node@^0.94.1`
- This project has: `@effect/platform-node@0.90.0`

You may want to loosen the peer dependency constraint to `^0.90.0` or document the minimum required version more clearly.
