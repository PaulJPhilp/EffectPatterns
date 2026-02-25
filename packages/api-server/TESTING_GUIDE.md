# MCP Server Testing Guide

Complete guide to running and configuring tests for the Effect Patterns MCP Server.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Test Types Overview](#test-types-overview)
3. [Running Specific Tests](#running-specific-tests)
4. [Environment Variables](#environment-variables)
5. [Configuration Details](#configuration-details)
6. [Troubleshooting](#troubleshooting)
7. [CI/CD Integration](#cicd-integration)

---

## Quick Start

### Run All Unit Tests
```bash
bun run test
# Duration: 10-15 seconds
# Runs: Unit tests in src/**/*.test.ts
```

### Run All Critical Tests
```bash
bun run test:full
# Duration: 2-3 minutes
# Runs: Unit + Routes + MCP + Auth tests
```

### Run Specific Test Type
```bash
# Routes and handlers
bun run test:routes

# MCP protocol
bun run test:mcp

# Integration (requires server startup)
bun run test:integration

# Workflows/E2E
bunx vitest run --config vitest.workflows.config.ts
```

---

## Test Types Overview

| Type | Config | Duration | Purpose | Requires |
|------|--------|----------|---------|----------|
| **Unit** | vitest.config.ts | 10-15s | Core services, utilities | None |
| **Routes** | vitest.routes.config.ts | 45-60s | API route handlers | Database |
| **MCP** | vitest.mcp.config.ts | 30-40s | MCP stdio protocol | MCP server |
| **Integration** | vitest.integration.config.ts | 20-30s | HTTP integration | Dev server (auto-started) |
| **Deployment** | vitest.deployment.config.ts | 90-120s | Staging/prod APIs | API keys, Network |
| **Workflows** | vitest.workflows.config.ts | 30-40s | E2E workflows | API server |
| **Stress** | vitest.stress.config.ts | Variable | Performance/load | Varies by test |

---

## Running Specific Tests

### 1. Unit Tests (Fastest)
```bash
bun run test
# What: Core service unit tests
# Files: src/**/*.test.ts
# Duration: ~10-15 seconds
# No dependencies required
```

### 2. Route Tests (Medium)
```bash
bun run test:routes
# What: API route handler tests
# Files: tests/routes/**/*.test.ts, src/server/__tests__/**/*.test.ts
# Duration: ~45-60 seconds
# Requires: PostgreSQL database (configured in setup-env.ts)
```

**Database Setup:**
```bash
# Ensure PostgreSQL is running and configured
# Default: DATABASE_URL should be set or use test database
# See: src/test/setup-env.ts
```

### 3. MCP Protocol Tests (Medium)
```bash
bun run test:mcp
# What: MCP stdio communication tests
# Files: tests/mcp-protocol/**/*.test.ts
# Duration: ~30-40 seconds
# Requires: Running MCP server on localhost:3000
```

**Local MCP Tests (Optional):**
```bash
# Run local MCP tests with custom environment
MCP_ENV=local bunx vitest run --config vitest.mcp.config.ts tests/mcp-protocol/local.test.ts

# With API key for authenticated tests
PATTERN_API_KEY="your-key" bunx vitest run --config vitest.mcp.config.ts
```

### 4. Integration Tests (Auto-starts Server)
```bash
bun run test:integration
# What: HTTP integration tests (real server)
# Files: src/**/*.integration.test.ts, src/server/init.test.ts
# Duration: ~20-30 seconds
# Behavior: Automatically starts dev server, runs tests, stops server
```

### 5. Deployment Tests (Requires API Keys)
```bash
# Staging environment
export STAGING_API_KEY="your-staging-key"
bun run test:deployment:staging
# Duration: ~90-120 seconds

# Production environment
export PRODUCTION_API_KEY="your-production-key"
bun run test:deployment:production
# Duration: ~90-120 seconds
```

**Getting API Keys:**
- Staging: Contact development team for staging API key
- Production: Production keys require approval and are not for local testing

**Validation:**
Tests validate required environment variables before running:
- Missing `STAGING_API_KEY` for staging tests → Error with instructions
- Missing `PRODUCTION_API_KEY` for production tests → Error with instructions

### 6. Workflow/E2E Tests (Sequential)
```bash
bunx vitest run --config vitest.workflows.config.ts
# What: Multi-step E2E workflows
# Files: tests/workflows/**/*.test.ts
# Duration: ~30-40 seconds
# Requires: API server (localhost:3000)
# Note: Tests run sequentially (not in parallel)
```

### 7. Stress Tests (Long-running)
```bash
# Run all stress tests
bun run test:stress:all

# Or specific stress test:
bun run test:stress:edge      # ~3 seconds (quick)
bun run test:stress:volume    # ~3 seconds
bun run test:stress:load      # ~300 seconds
bun run test:stress:spike     # ~380 seconds
bun run test:stress:endurance # ~2400 seconds (40+ minutes)
```

**Note:** Stress tests require port 3001 to be available.

---

## Environment Variables

### Required for Different Test Types

#### Unit Tests (vitest.config.ts)
```bash
# Optional - improves test output
DEBUG_TESTS=true
```

#### Route Tests (vitest.routes.config.ts)
```bash
# Database configuration
DATABASE_URL="postgres://user:password@localhost:5432/test_db"

# Optional - disables Vercel KV
KV_REST_API_URL=""
KV_REST_API_TOKEN=""
```

#### MCP Tests (vitest.mcp.config.ts)
```bash
# Optional - API key (not required for stdio tests)
PATTERN_API_KEY="test-key"

# Optional - API URL
EFFECT_PATTERNS_API_URL="http://localhost:3000"

# Optional - debug MCP communication
MCP_DEBUG=true
```

#### Integration Tests (vitest.integration.config.ts)
```bash
# Same as route tests (route tests + integration = same env)
DATABASE_URL="postgres://..."
PATTERN_API_KEY="test-key"  # optional
```

#### Deployment Tests (vitest.deployment.config.ts)
```bash
# REQUIRED - One of these must be set
STAGING_API_KEY="your-staging-api-key"      # For staging tests
PRODUCTION_API_KEY="your-production-api-key" # For production tests

# REQUIRED - Environment selection
DEPLOYMENT_ENV=staging  # or 'production'
```

#### Workflow/E2E Tests (vitest.workflows.config.ts)
```bash
# Same as integration tests
DATABASE_URL="postgres://..."
PATTERN_API_KEY="test-key"  # optional
EFFECT_PATTERNS_API_URL="http://localhost:3000"
```

#### Stress Tests (vitest.stress.config.ts)
```bash
# Port 3001 must be available
# Tests use: startServer({ port: 3001 })
```

---

## Configuration Details

### Shared Base Configuration (vitest.config.base.ts)

All configs extend from a shared base that provides:
- Global test utilities: `describe`, `it`, `expect`, `beforeAll`, etc.
- Node environment
- Path alias: `@` → `./src`
- Coverage configuration (v8 provider)

### Config-Specific Overrides

Each config extends the base and overrides:
- `include`: Test file patterns
- `setupFiles`: Files to run before tests
- `globalSetup`: Server/service startup (if needed)
- `testTimeout`: Timeout for individual tests
- `hookTimeout`: Timeout for beforeAll/afterAll
- `fileParallelism`: Sequential (false) or parallel (true/not set)

### Timeout Rationale

| Config | Timeout | Why |
|--------|---------|-----|
| Unit | 30s | Tests are fast, fail quickly |
| Routes | 45s | Database queries + handlers |
| MCP | 35s | Network I/O + SDK communication |
| Integration | 45s | Server startup + HTTP calls |
| Deployment | 90s | Remote APIs + network latency |
| Workflows | 60s | Multi-step workflows |
| Stress | 2100s | 35+ minute endurance tests |

---

## Troubleshooting

### Test Timeouts

**Problem:** Test times out even though it completes quickly locally
**Solution:**
- Increase timeout in specific config
- Check system load (CI might be slower)
- Verify no external service blocking

### Port Already in Use

**Problem:** Error "port 3000 already in use"
```
EADDRINUSE: address already in use :::3000
```
**Solution:**
```bash
# Kill process on port 3000
lsof -i :3000
kill -9 <PID>

# Or find what's using it
netstat -tulpn | grep :3000
```

### Database Connection Failed

**Problem:** Tests fail with "cannot connect to database"
**Solution:**
```bash
# Verify PostgreSQL is running
psql -U postgres -d test_db

# Check DATABASE_URL is set
echo $DATABASE_URL

# Run migrations if needed
npm run db:migrate
```

### MCP Server Connection Failed

**Problem:** MCP tests fail with "cannot connect to MCP server"
**Solution:**
```bash
# Start MCP server first (in another terminal)
cd packages/mcp-server
bun run dev

# Then run MCP tests
bun run test:mcp
```

### API Key Validation Error

**Problem:** Deployment tests fail with "Missing required environment variable"
**Solution:**
```bash
# For staging
export STAGING_API_KEY="your-api-key"
bun run test:deployment:staging

# For production
export PRODUCTION_API_KEY="your-api-key"
bun run test:deployment:production
```

### Tests Run But All Fail

**Problem:** All tests fail with same error
**Causes:**
1. Setup file failure - check `beforeAll` output
2. Server not running - check integration/workflow tests
3. Database not accessible - check database connection
4. Missing environment variables - check logs for required vars

**Debug:**
```bash
# Run with verbose output
DEBUG=* bun run test

# Run single test file with debugging
NODE_DEBUG=* bunx vitest tests/routes/health.route.test.ts
```

---

## CI/CD Integration

### GitHub Actions Setup

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run unit tests
        run: bun run test

      - name: Run routes tests
        run: bun run test:routes
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test_db

      - name: Run MCP tests
        run: bun run test:mcp

      - name: Run integration tests
        run: bun run test:integration
```

### Environment Variables in CI

```bash
# Set in GitHub Actions secrets
STAGING_API_KEY     # For staging deployment tests
PRODUCTION_API_KEY  # For production deployment tests

# Set in workflow file
DATABASE_URL=postgres://postgres:postgres@localhost:5432/test_db
```

### Parallel CI Execution

```bash
# Fast tests can run in parallel
bun run test & bun run test:routes & bun run test:mcp

# Wait for all to complete
wait
```

---

## Performance Tips

### Speed Up Tests

1. **Run only unit tests first**
   ```bash
   bun run test  # 10-15 seconds
   ```

2. **Skip slow tests in watch mode**
   ```bash
   # In vitest.config.ts, add skip config
   skip: process.env.CI ? false : 'deployment,stress'
   ```

3. **Use test.only for focused debugging**
   ```typescript
   it.only("specific test", () => {
     // This test runs, others are skipped
   });
   ```

4. **Run tests in parallel where possible**
   - Unit tests: ✅ Parallel
   - Routes: ✅ Parallel (independent DB)
   - MCP: ❌ Sequential (shared server)
   - Integration: ❌ Sequential (shared server)
   - Deployment: ❌ Sequential (rate limits)
   - Workflows: ❌ Sequential (shared API)

### Monitor Performance

```bash
# Time specific test suite
time bun run test:routes

# Profile test execution
NODE_OPTIONS=--prof bun run test
node --prof-process isolate-*.log > prof.txt
```

---

## Additional Resources

- [Vitest Documentation](https://vitest.dev)
- [Effect-TS Documentation](https://effect.website)
- [MCP SDK Documentation](https://modelcontextprotocol.io)
- [Next.js Testing](https://nextjs.org/docs/testing)

---

## Questions?

For issues or questions about testing:
1. Check troubleshooting section above
2. Review test setup files in `src/test/` and `tests/*/setup.ts`
3. Check CI configuration in `.github/workflows/`
4. Review individual test files for examples
