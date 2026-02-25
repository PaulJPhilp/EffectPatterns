# Release Checklist

Quick checklist before deploying the MCP server.

## Pre-Deployment

- [ ] Run preflight checks: `bun run preflight`
  - Builds stdio server
  - Checks for narration leakage (stdout pollution)
  - Tests MCP protocol locally
- [ ] Verify test coverage ≥ 80%: `bun run test:coverage`
- [ ] Run full test suite: `bun run test:full`
- [ ] Run workspace typecheck: `bun run typecheck` (from repo root)
- [ ] Run all linting: `bun run lint:all` (from repo root)
- [ ] Check CI passes (optional but recommended - catches env drift)
- [ ] Confirm deploy trigger mode: git-triggered deploys are disabled via `ignoreCommand`; use manual `vercel --prod`

## Environment Variables

Verify these are set in Vercel project settings for each environment:

| Variable | Staging (Preview) | Production |
|----------|-------------------|------------|
| `DATABASE_URL` | Auto-set by Vercel Postgres binding | Auto-set by Vercel Postgres binding |
| `PATTERN_API_KEY` | Unique key | Unique key (different from staging) |
| `LOG_LEVEL` | `info` | `warn` |
| `TRACING_ENABLED` | `true` | `true` |
| `TRACING_SAMPLING_RATE` | `0.1` | `0.05` |
| `KV_REST_API_URL` | (optional, for rate limiting) | (optional) |
| `KV_REST_API_TOKEN` | (optional) | (optional) |

Note: `VERCEL_ENV` is auto-set by Vercel (`preview` or `production`).

## Database Migration

- [ ] Verify database schema is up to date (migrations run automatically during Vercel build)
- [ ] For initial setup, push schema manually: `DATABASE_URL="<url>" bunx drizzle-kit push`
- [ ] Seed patterns if needed: `DATABASE_URL="<url>" bun run ingest`
- [ ] Verify DB connectivity: `DATABASE_URL="<url>" bun run test:db:quick`

## Deployment

### Staging
- [ ] Deploy: `bun run deploy:staging` (from repo root)
- [ ] Verify health: `curl https://<staging-url>/api/health`
- [ ] Verify deep health: `curl "https://<staging-url>/api/health?deep=true"`
- [ ] Run deployment tests: `STAGING_API_KEY="<key>" bun run --filter @effect-patterns/api-server test:deployment:staging`

### Production
- [ ] Deploy: `bun run deploy:production` (from repo root)
- [ ] Verify health: `curl https://effect-patterns-mcp.vercel.app/api/health`
- [ ] Verify deep health: `curl "https://effect-patterns-mcp.vercel.app/api/health?deep=true"`
- [ ] Run deployment tests: `PRODUCTION_API_KEY="<key>" bun run --filter @effect-patterns/api-server test:deployment:production`
- [ ] Monitor logs for first few minutes

## Post-Deployment

- [ ] Verify MCP tools are discoverable
- [ ] Test pattern search functionality
- [ ] Check error rates in monitoring
- [ ] Verify API key authentication works
- [ ] Track migration from Next.js `middleware` to `proxy` convention (deprecation warning; non-blocking for this release)

---

**Quick Commands:**
```bash
# Full pre-deploy validation
bun run --filter @effect-patterns/api-server preflight && bun run typecheck && bun run lint:all

# Deploy staging
bun run deploy:staging

# Deploy production
bun run deploy:production
```

**Note:** CI is optional but recommended - it acts as your "second machine" that catches environment drift and integration issues.
