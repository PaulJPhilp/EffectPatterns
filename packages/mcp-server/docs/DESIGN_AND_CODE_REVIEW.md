# MCP Server Design & Code Review

Design and code review of the Effect Patterns MCP server, with fixes applied in priority order.

## Summary of Fixes Applied

### P0 – Security (Critical)

1. **Remove hardcoded production API key**
   - **Where**: `package.json` `mcp:production` script
   - **Issue**: Script used `PATTERN_API_KEY=${PATTERN_API_KEY:-ce9a3a...}` with a hardcoded fallback.
   - **Fix**: Use `bun dist/mcp-production-client.js` only. Callers must set `PRODUCTION_API_KEY` or `PATTERN_API_KEY` in environment.

2. **Redact production API key from docs**
   - **Where**: `MCP-README.md`
   - **Issue**: Examples and “Production Key” section contained the real key.
   - **Fix**: Replaced with `"${PRODUCTION_API_KEY}"` and instructions to set env vars. Removed the “Production Key” value.

3. **`import-to-production` script**
   - **Where**: `import-to-production.ts`
   - **Issue**: Verify step used a hardcoded API key.
   - **Fix**: Use `PRODUCTION_API_KEY` or `PATTERN_API_KEY` from env; throw if neither is set.

### P1 – Correctness & Performance

4. **Patterns route catch block**
   - **Where**: `app/api/patterns/route.ts`
   - **Issue**: On init/unexpected failure, catch called `runWithRuntime(errorHandler(error))`. If init is broken, that can throw again and leave errors unhandled. `errorToResponse` is sync and needs no runtime.
   - **Fix**: In catch, use `errorToResponse(error, traceId)` directly (with `traceId = randomUUID().replace(/-/g, "")`) and return that response. No Effect runtime in the catch path.

5. **Extra `/patterns` call in `search_patterns`**
   - **Where**: `src/tools/tool-implementations.ts`
   - **Issue**: Every `search_patterns` call (including cache hits) did an extra `callApi("/patterns")` for “DIAGNOSTIC: Check total patterns in DB,” doubling traffic and adding latency.
   - **Fix**: Gate the diagnostic fetch, 0/<10 pattern checks, and all `[DIAGNOSTIC]` logging behind `MCP_DEBUG === "true"`. When debug is off, skip that block and go straight to cache/search.

6. **`adminAuth` Effect.tryPromise**
   - **Where**: `src/auth/adminAuth.ts`
   - **Issue**: `Effect.tryPromise` wrapped `new Promise(resolve => resolve(process.env.ADMIN_API_KEY))`, which never rejects. Unnecessary and misleading.
   - **Fix**: Use `Effect.sync(() => process.env.ADMIN_API_KEY)`.

### P2 – Code Quality & Security Hardening

7. **`RoutResponse` typo**
   - **Where**: `src/server/routeHandler.ts`
   - **Fix**: Renamed to `RouteResponse`.

8. **`env-check` endpoint**
   - **Where**: `app/api/env-check/route.ts`
   - **Issue**: Exposed `databaseUrlPrefix` (first 20 chars of `DATABASE_URL`), `apiKeyLength`, and `allEnvKeys`, leaking sensitive hints.
   - **Fix**: Return only non-sensitive flags: `hasDatabaseUrl`, `nodeEnv`, `customNodeEnv`, `hasApiKey`. Removed lengths, prefixes, and key names.

9. **Tool diagnostics**
   - **Where**: `src/tools/tool-implementations.ts`
   - **Issue**: Mix of `console.error` and `log` for diagnostics; diagnostic work ran even when `MCP_DEBUG` was off.
   - **Fix**: Use `log()` only for diagnostics. Gate match-analysis, API response size, final response size, and output-size-limit diagnostics behind `isDebug` (from `MCP_DEBUG`).

## Design Notes (No Code Changes)

- **Auth**: API key via `x-api-key` / `?key`; admin via `x-admin-key` / `?admin-key`. Config service holds API key; admin key stays in `process.env` only. Consider adding `adminKey` to config for consistency.
- **Layers**: `init` composes Config → Tracing → Database → Patterns → App. `runWithRuntime` provides `AppLayer` and runs scoped effects. Test layer omits `NodeContext` for unit tests.
- **Error handling**: `errorToResponse` maps tagged errors to HTTP responses. Routes use `Effect.catchAll(errorHandler)` so handlers don’t throw; catch blocks cover init/unexpected failures only.
- **MCP transport**: Stdio client is transport-only; auth is enforced by the HTTP API. Connection pooling and in-flight deduping are in place.

## Remaining Recommendations

- **`test-mcp-server.sh`**: Uses `dev-key` as local default (updated). No further change needed.
- **`.windsurf/mcp_config.json`**, **`.claude/mcp_config.json`**: Now use `"${PRODUCTION_API_KEY}"` instead of hardcoded keys. Set `PRODUCTION_API_KEY` in your environment or IDE config.
- **`createPublicHandler`**: No auth. Document that it’s for health/unauthenticated endpoints only.
- **`init` NodeContext**: Uses `require("@effect/platform-node")` for lazy loading. Could be switched to dynamic `import()` for ESM consistency.

## How to Verify

- `bun run test:auth` – auth unit tests
- `bun run test:routes` – route and error-handler tests (including patterns)
- `bun run test:mcp:local` – MCP protocol tests (with `PATTERN_API_KEY` set)
- Set `PRODUCTION_API_KEY` or `PATTERN_API_KEY` when using `mcp:production` or production HTTP API.
