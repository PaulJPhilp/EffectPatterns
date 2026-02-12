# Environment Variables Matrix

Complete reference for all environment variables used across different test configurations and environments.

---

## Summary Table

| Variable | Unit | Routes | MCP | Integration | Workflows | Deployment | Stress | Default | Purpose |
|----------|------|--------|-----|-------------|-----------|------------|--------|---------|---------|
| `DATABASE_URL` | ❌ | ✅ Required | ❌ | ✅ Required | ✅ Required | ❌ | ❌ | (See setup) | PostgreSQL connection |
| `PATTERN_API_KEY` | ❌ | ❌ | Optional | Optional | Optional | ❌ | ❌ | None | API authentication (MCP) |
| `STAGING_API_KEY` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Required (staging) | ❌ | None | Staging API auth |
| `PRODUCTION_API_KEY` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Required (prod) | ❌ | None | Production API auth |
| `DEPLOYMENT_ENV` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Required | ❌ | "staging" | Test environment |
| `EFFECT_PATTERNS_API_URL` | ❌ | ❌ | Optional | Optional | Optional | ❌ | ❌ | http://localhost:3000 | API server URL |
| `KV_REST_API_URL` | ❌ | Optional | ❌ | Optional | Optional | ❌ | ❌ | (disabled) | Vercel KV endpoint |
| `KV_REST_API_TOKEN` | ❌ | Optional | ❌ | Optional | Optional | ❌ | ❌ | (disabled) | Vercel KV token |
| `MCP_DEBUG` | ❌ | ❌ | Optional | ❌ | ❌ | ❌ | ❌ | false | Enable MCP debug logs |
| `MCP_ENV` | ❌ | ❌ | Optional | ❌ | ❌ | ❌ | ❌ | "production" | MCP environment |
| `DEBUG_TESTS` | Optional | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | false | Enable test debugging |
| `CI` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (checks) | ❌ | false | Detect CI/CD environment |

---

## Detailed Variable Reference

### Database Variables

#### `DATABASE_URL`
**Type:** Connection string
**Required for:** Routes, Integration, Workflows tests
**Default:** `postgres://localhost/effect_patterns_test` (from setup-env.ts)
**Format:** `postgres://[user]:[password]@[host]:[port]/[database]`

**Examples:**
```bash
# Local development
DATABASE_URL="postgres://postgres:password@localhost:5432/test_db"

# Docker
DATABASE_URL="postgres://postgres:password@db:5432/test_db"

# GitHub Actions
DATABASE_URL="postgres://postgres:postgres@localhost:5432/test_db"
```

**Used by:**
- `src/test/setup-env.ts` - Routes, Integration, Workflow tests
- Database connection for all HTTP-based tests
- Automatically disabled in unit tests (no DB needed)

---

### API Authentication Variables

#### `PATTERN_API_KEY`
**Type:** String (API key)
**Required for:** MCP tests (optional), Workflow tests (optional)
**Default:** None
**Format:** Alphanumeric string

**When to set:**
```bash
# For MCP tests with authentication
PATTERN_API_KEY="test-key" bun run test:mcp

# For workflow tests with auth-required endpoints
PATTERN_API_KEY="test-key" bunx vitest run --config vitest.workflows.config.ts
```

**Note:** MCP is a pure transport layer, so API key is optional for MCP tests but may be needed for authenticated endpoints in workflows.

#### `STAGING_API_KEY`
**Type:** String (API key)
**Required for:** Deployment tests with `DEPLOYMENT_ENV=staging`
**Default:** None (will error if missing)
**Format:** Valid API key for staging environment

**How to get:**
```bash
# Request staging API key from development team
# Store securely in environment or CI secrets
export STAGING_API_KEY="your-staging-key"
```

**Usage:**
```bash
export STAGING_API_KEY="your-key"
bun run test:deployment:staging
```

#### `PRODUCTION_API_KEY`
**Type:** String (API key)
**Required for:** Deployment tests with `DEPLOYMENT_ENV=production`
**Default:** None (will error if missing)
**Format:** Valid API key for production environment

**Important:** Production keys should **never** be used locally or in development CI. Only use in approved production CI/CD.

**Usage:**
```bash
export PRODUCTION_API_KEY="your-key"
bun run test:deployment:production
```

---

### Deployment Configuration

#### `DEPLOYMENT_ENV`
**Type:** Enum ("staging" | "production")
**Required for:** Deployment tests
**Default:** "staging"
**Purpose:** Determines which environment deployment tests target and which API key to require

**Validation:**
- Must be "staging" or "production"
- Tests will fail if invalid value provided
- Determines which API key is required:
  - "staging" → requires `STAGING_API_KEY`
  - "production" → requires `PRODUCTION_API_KEY`

**Usage:**
```bash
# Default (staging)
STAGING_API_KEY="key" bun run test:deployment:staging

# Explicit staging
DEPLOYMENT_ENV=staging STAGING_API_KEY="key" bun run test:deployment:staging

# Production (requires approval)
DEPLOYMENT_ENV=production PRODUCTION_API_KEY="key" bun run test:deployment:production
```

---

### API Server Configuration

#### `EFFECT_PATTERNS_API_URL`
**Type:** URL
**Required for:** None (optional)
**Default:** "http://localhost:3000"
**Used by:** MCP tests, Workflow tests
**Purpose:** Configure which API server to connect to

**Examples:**
```bash
# Default (local)
EFFECT_PATTERNS_API_URL="http://localhost:3000"

# Staging
EFFECT_PATTERNS_API_URL="https://effect-patterns-mcp-staging.vercel.app"

# Production
EFFECT_PATTERNS_API_URL="https://effect-patterns-mcp.vercel.app"
```

**Auto-configured in:**
- `tests/mcp-protocol/setup.ts` - From `getMCPEnvironmentConfig()`
- `tests/deployment/setup.ts` - From environment selection

---

### Caching Configuration

#### `KV_REST_API_URL`
**Type:** URL
**Required for:** None (can be disabled)
**Default:** "" (empty/disabled)
**Used by:** Routes, Integration, Workflow tests
**Purpose:** Vercel KV cache endpoint

**When to set:**
```bash
# If using Vercel KV in tests (not typical for local)
KV_REST_API_URL="https://your-kv.vercel.sh"
KV_REST_API_TOKEN="token"
```

**When to leave empty (recommended):**
```bash
# Leave empty to disable KV (default behavior)
# Tests will skip KV-dependent features gracefully
KV_REST_API_URL=""
KV_REST_API_TOKEN=""
```

#### `KV_REST_API_TOKEN`
**Type:** String (secret token)
**Required for:** None (can be disabled)
**Default:** "" (empty/disabled)
**Used by:** Routes, Integration, Workflow tests
**Paired with:** `KV_REST_API_URL`

**Note:** Should never be hardcoded; use CI secrets if needed.

---

### Debug Configuration

#### `MCP_DEBUG`
**Type:** Boolean (true/false or 1/0)
**Required for:** None (optional)
**Default:** false
**Used by:** MCP tests
**Purpose:** Enable detailed MCP communication logging

**Usage:**
```bash
# Show MCP debug output
MCP_DEBUG=true bun run test:mcp

# Show with stderr inheritance
DEBUG_MCP=true bun run test:mcp
```

**Output includes:**
- Incoming JSON-RPC messages
- Outgoing JSON-RPC messages
- Tool invocations
- Error details

#### `MCP_ENV`
**Type:** String ("production" | "local" | custom)
**Required for:** None (optional)
**Default:** "production"
**Used by:** MCP tests
**Purpose:** Configure MCP environment behavior

**Values:**
- `"production"` - Hide debug tools like `get_mcp_config`
- `"local"` - Show debug tools, enable verbose output
- Custom values for testing specific environments

**Usage:**
```bash
# Test production MCP (without debug tools)
MCP_ENV=production bun run test:mcp

# Test local MCP (with debug tools)
MCP_ENV=local bunx vitest run --config vitest.mcp.config.ts tests/mcp-protocol/local.test.ts

# Custom environment
MCP_ENV=custom bun run test:mcp
```

#### `DEBUG_TESTS`
**Type:** Boolean (true/false or 1/0)
**Required for:** None (optional)
**Default:** false
**Used by:** Unit tests (when set)
**Purpose:** Enable verbose test output for debugging

**Usage:**
```bash
# Show detailed test output
DEBUG_TESTS=true bun run test

# Combine with other debug vars
DEBUG_TESTS=true MCP_DEBUG=true bun run test:mcp
```

---

### CI/CD Detection

#### `CI`
**Type:** Boolean string ("true" | "false")
**Set automatically by:** GitHub Actions, GitLab CI, etc.
**Default:** false (local development)
**Purpose:** Detect if running in CI/CD environment

**Used by:**
- `tests/deployment/setup.ts` - Strict validation in CI
- `tests/mcp-protocol/local.test.ts` - Auth error handling

**Behavior in CI:**
```typescript
if (process.env.CI === "true" && !apiKey) {
  throw new Error("FATAL: API key missing in CI environment");
}
```

---

## Setup File Reference

### `src/test/setup-env.ts`
Sets up common test environment variables.

**Variables set/used:**
- `DATABASE_URL` - PostgreSQL connection
- `KV_REST_API_URL` - Vercel KV (disabled if not set)
- `KV_REST_API_TOKEN` - Vercel KV (disabled if not set)
- `PATTERN_API_KEY` - Optional, from environment

**Used by:**
- vitest.config.ts (unit tests)
- vitest.routes.config.ts
- vitest.workflows.config.ts
- vitest.integration.config.ts

### `tests/deployment/setup.ts`
Validates deployment test environment variables.

**Variables validated:**
- `DEPLOYMENT_ENV` - Must be set and valid
- `STAGING_API_KEY` or `PRODUCTION_API_KEY` - Must match environment

**Behavior:**
- Throws clear error if variables missing
- Logs which environment tests will use
- Prevents running tests without proper configuration

### `tests/mcp-protocol/setup.ts`
Configures MCP test environment.

**Variables set/used:**
- `EFFECT_PATTERNS_API_URL` - API URL
- `MCP_DEBUG` - Debug flag
- `PATTERN_API_KEY` - Optional API key

**Auto-configures from:**
- `getMCPEnvironmentConfig()` helper

---

## Common Scenarios

### Local Development
```bash
# Unit tests only (no env vars needed)
bun run test

# Routes + integration (need database)
DATABASE_URL="postgres://localhost/test_db" bun run test:routes

# MCP tests (optional API key)
PATTERN_API_KEY="test" bun run test:mcp

# Full local suite (all together)
DATABASE_URL="postgres://localhost/test_db" \
PATTERN_API_KEY="test" \
bun run test:full
```

### GitHub Actions CI
```yaml
env:
  DATABASE_URL: postgres://postgres:postgres@localhost:5432/test_db
  STAGING_API_KEY: ${{ secrets.STAGING_API_KEY }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: bun run test
      - run: bun run test:routes
      - run: bun run test:mcp
      - run: DEPLOYMENT_ENV=staging bun run test:deployment:staging
```

### Docker Compose
```bash
# Start services
docker-compose up -d

# Run tests with docker database
DATABASE_URL="postgres://postgres:postgres@db:5432/test_db" \
bun run test:routes
```

### Production Deployment Testing
```bash
# ⚠️ PRODUCTION - USE WITH CAUTION
PRODUCTION_API_KEY="$PROD_KEY" \
DEPLOYMENT_ENV=production \
bun run test:deployment:production
```

---

## Troubleshooting

### "Missing required environment variable: DATABASE_URL"
```bash
# Solution: Set DATABASE_URL before running routes tests
export DATABASE_URL="postgres://localhost/test_db"
bun run test:routes
```

### "Invalid DEPLOYMENT_ENV"
```bash
# Wrong value
DEPLOYMENT_ENV=qa bun run test:deployment:staging  # ❌ Error

# Correct values
DEPLOYMENT_ENV=staging bun run test:deployment:staging  # ✅
DEPLOYMENT_ENV=production bun run test:deployment:production  # ✅
```

### API Key Validation Error
```bash
# Missing STAGING_API_KEY when running staging tests
bun run test:deployment:staging
# Error: Missing required environment variable: STAGING_API_KEY

# Solution:
export STAGING_API_KEY="your-key"
bun run test:deployment:staging
```

### "Cannot connect to API"
```bash
# Wrong API URL
EFFECT_PATTERNS_API_URL="https://wrong-url" bun run test:mcp

# Solution: Use default or correct URL
unset EFFECT_PATTERNS_API_URL
bun run test:mcp  # Uses default http://localhost:3000
```

---

## Security Best Practices

1. **Never commit API keys**
   ```bash
   # ❌ Don't do this
   export STAGING_API_KEY="key123" >> ~/.bashrc

   # ✅ Do this instead
   export STAGING_API_KEY="key123"  # Type in terminal each time
   ```

2. **Use CI secrets for sensitive variables**
   ```yaml
   # GitHub Actions
   STAGING_API_KEY: ${{ secrets.STAGING_API_KEY }}
   ```

3. **Rotate keys regularly**
   - Change API keys every 90 days
   - Invalidate old keys immediately

4. **Limit key scope**
   - Staging API key: Can only access staging
   - Production API key: Limited to CI/CD only

5. **Audit key usage**
   - Log which tests used which keys
   - Monitor for suspicious access patterns

---

## Quick Reference

```bash
# Unit tests (no env vars)
bun run test

# Routes (need database)
DATABASE_URL="..." bun run test:routes

# MCP (optional API key)
bun run test:mcp

# Integration (auto-starts server)
bun run test:integration

# Deployment (need API key)
STAGING_API_KEY="..." bun run test:deployment:staging

# Workflows (need database + API)
DATABASE_URL="..." PATTERN_API_KEY="..." bunx vitest run --config vitest.workflows.config.ts

# Full suite
DATABASE_URL="..." PATTERN_API_KEY="..." STAGING_API_KEY="..." bun run test:full
```
