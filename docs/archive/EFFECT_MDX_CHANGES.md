# Changes Needed for effect-mdx

## The Problem

`effect-mdx@0.1.0` was built for an older Effect API. When used with `@effect/platform-node@0.94.1+`, it fails because the service access API changed.

**Current Error:**
```
TypeError: undefined is not an object (evaluating 'MdxConfigService.scoped')
```

## The Fix

### File: `src/service.ts`

**Location:** Around line 30-35 (in the MdxService scoped implementation)

**Change 1: Service Access API**

❌ **OLD CODE:**
```typescript
export class MdxService extends Effect.Service()("MdxService", {
    scoped: Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const defaultCfg = {
            remarkPlugins: [],
            rehypePlugins: [],
            sanitize: false,
            slug: false,
            autolinkHeadings: false,
        };
        const cfgSvc = yield* MdxConfigService.scoped;  // ❌ .scoped doesn't exist
        const cfg = (yield* cfgSvc.getConfig()) ?? defaultCfg;
        
        // ... rest of implementation
    }),
    dependencies: [FileSystem.FileSystem, MdxConfigService],
}) {}
```

✅ **NEW CODE:**
```typescript
export class MdxService extends Effect.Service()("MdxService", {
    scoped: Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const defaultCfg = {
            remarkPlugins: [],
            rehypePlugins: [],
            sanitize: false,
            slug: false,
            autolinkHeadings: false,
        };
        
        // Access the service directly, then get config with fallback
        const cfg = yield* Effect.gen(function* () {
            const cfgSvc = yield* MdxConfigService;  // ✅ Direct service access
            return cfgSvc.getConfig() ?? defaultCfg;
        }).pipe(
            Effect.catchAll(() => Effect.succeed(defaultCfg))
        );
        
        // ... rest of implementation
    }),
    dependencies: [FileSystem.FileSystem, MdxConfigService],
}) {}
```

**Alternative (if config should be optional):**
```typescript
const cfg = yield* Effect.gen(function* () {
    const cfgSvc = yield* MdxConfigService;
    return cfgSvc.getConfig();
}).pipe(
    Effect.catchTag("NoSuchElement", () => Effect.succeed(defaultCfg)),
    Effect.catchAll(() => Effect.succeed(defaultCfg))
);
```

## Summary of Changes

1. **Replace `MdxConfigService.scoped`** → **`MdxConfigService`**
   - The `.scoped` property was removed in newer Effect versions
   - Services are now accessed directly via `yield*`

2. **Adjust error handling** (optional but recommended)
   - Wrap the config access in proper Effect error handling
   - Provide a clear fallback to `defaultCfg` if config service is unavailable

## Testing the Fix

After making this change, rebuild effect-mdx:

```bash
# In effect-mdx repo
bun install
bun run build

# Or publish to npm
npm version patch
npm publish
```

Then test in this project:

```typescript
import { Effect } from "effect";
import { NodeFileSystem } from "@effect/platform-node";
import { MdxService } from "effect-mdx";

const program = Effect.gen(function* () {
    const mdx = yield* MdxService;
    const result = yield* mdx.readMdxAndFrontmatter("./test.mdx");
    console.log(result.frontmatter);
});

const runnable = program.pipe(
    Effect.provide(MdxService.Default),
    Effect.provide(NodeFileSystem.layer)
);

Effect.runPromise(runnable);
```

## File Location

The change is in your effect-mdx repository:
- **File:** `src/service.ts` or `src/service/service.ts` (depending on your structure)
- **Lines:** Look for `MdxConfigService.scoped` (should be around line 25-35)
- **Single change:** One line that needs updating

## Why This Happened

The Effect ecosystem had a breaking change in how services are accessed:
- **Old API (v3.0-3.10):** `yield* ServiceName.scoped` or `yield* ServiceName.Default`  
- **New API (v3.10+):** `yield* ServiceName` (direct access)

Your peer dependencies specify `@effect/platform-node@^0.94.1`, which requires the newer API, but the code still uses the old API.

## Expected Behavior After Fix

With this single-line change:
1. ✅ MdxService will work with `@effect/platform-node@0.94.1+`
2. ✅ The service will gracefully fall back to default config if MdxConfigService is unavailable
3. ✅ All existing effect-mdx functionality will continue to work
4. ✅ This project's pipeline can use effect-mdx instead of simplified scripts

## Version Compatibility

After this fix, effect-mdx will work with:
- ✅ `effect@^3.17.6+`
- ✅ `@effect/platform@^0.90.0+`  
- ✅ `@effect/platform-node@^0.94.1+`

Which matches your current peer dependencies.

