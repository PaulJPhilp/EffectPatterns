# Installation Issue Fix

## Problem

The CLI fails to install/run due to a missing export in `@effect/platform/MsgPack`. The `@effect/rpc` package tries to import `Msgpackr` from `@effect/platform/MsgPack`, but this export doesn't exist.

## Root Cause

```typescript
// This import fails in @effect/rpc/RpcSerialization.js
import { Msgpackr } from "@effect/platform/MsgPack";
```

But `@effect/platform/MsgPack` only imports `Msgpackr` internally without re-exporting it:

```typescript
// In @effect/platform/src/MsgPack.ts
import * as Msgpackr from "msgpackr";
// But no: export { Msgpackr }
```

## Temporary Fix

Use the built CLI directly or install without the RPC dependency.

## Long-term Fix

This needs to be fixed upstream in the Effect ecosystem. Either:

1. `@effect/platform` should export `Msgpackr`
2. `@effect/rpc` should import `Msgpackr` directly from `msgpackr`

## Workaround Commands

```bash
# Build the packages
bun run build

# Test individual packages
node packages/ep-cli/dist/index.js --help
```
